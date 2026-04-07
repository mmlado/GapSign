/* eslint-disable no-bitwise */
import * as secp from '@noble/secp256k1';
import { URDecoder } from '@ngraveio/bc-ur';
import CBOR from 'cbor-sync';

import {
  buildBtcSignatureUR,
  hashBitcoinMessage,
  parseKeycardBtcMessageSignature,
} from '../src/utils/btcMessage';

function tlvEncode(tag: number, value: Uint8Array): Uint8Array {
  const len = value.length;
  let header: Uint8Array;
  if (len < 0x80) {
    header = new Uint8Array([tag, len]);
  } else if (len < 0x100) {
    header = new Uint8Array([tag, 0x81, len]);
  } else {
    header = new Uint8Array([tag, 0x82, (len >> 8) & 0xff, len & 0xff]);
  }
  const out = new Uint8Array(header.length + len);
  out.set(header, 0);
  out.set(value, header.length);
  return out;
}

function derInt(n: Uint8Array): Uint8Array {
  let start = 0;
  while (start < n.length - 1 && n[start] === 0) {
    start++;
  }
  const trimmed = n.slice(start);
  if (trimmed[0] >= 0x80) {
    const padded = new Uint8Array(trimmed.length + 1);
    padded[0] = 0x00;
    padded.set(trimmed, 1);
    return tlvEncode(0x02, padded);
  }
  return tlvEncode(0x02, trimmed);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function buildSignatureTLV(
  pubKey: Uint8Array,
  r: Uint8Array,
  s: Uint8Array,
): Uint8Array {
  const sequence = tlvEncode(0x30, concatBytes(derInt(r), derInt(s)));
  const inner = concatBytes(tlvEncode(0x80, pubKey), sequence);
  return tlvEncode(0xa0, inner);
}

function decodeUR(urString: string): Record<number, any> {
  const decoder = new URDecoder();
  decoder.receivePart(urString);
  return CBOR.decode(decoder.resultUR().cbor);
}

const PRIV_KEY = new Uint8Array(32);
PRIV_KEY[31] = 1;

describe('btcMessage', () => {
  it('hashes legacy Bitcoin messages with the shell-compatible prefix', () => {
    const hash = hashBitcoinMessage(
      Buffer.from('hello btc', 'utf8').toString('hex'),
    );

    expect(Buffer.from(hash).toString('hex')).toBe(
      'f43270780f43a66bd855d3640d581d2621589f760eadc69a282d0e37d4f77783',
    );
  });

  it('converts a Keycard recoverable signature into compact Bitcoin message format', async () => {
    const hash = hashBitcoinMessage(
      Buffer.from('hello btc', 'utf8').toString('hex'),
    );
    const sigBytes = await secp.signAsync(hash, PRIV_KEY, {
      prehash: false,
      format: 'recovered',
      extraEntropy: false,
    });
    const recId = sigBytes[0];
    const r = sigBytes.slice(1, 33);
    const s = sigBytes.slice(33, 65);
    const pubKey = secp.getPublicKey(PRIV_KEY, false);
    const tlv = buildSignatureTLV(pubKey, r, s);

    const { signature, publicKey } = parseKeycardBtcMessageSignature(hash, tlv);

    expect(signature).toHaveLength(65);
    expect(signature[0]).toBe(31 + recId);
    expect(signature.subarray(1, 33)).toEqual(Buffer.from(r));
    expect(signature.subarray(33, 65)).toEqual(Buffer.from(s));
    expect(publicKey).toEqual(Buffer.from(secp.getPublicKey(PRIV_KEY, true)));
  });

  it('builds a btc-signature UR with signature and public key bytes', () => {
    const signature = Buffer.alloc(65, 0x11);
    const publicKey = Buffer.alloc(33, 0x02);
    const ur = buildBtcSignatureUR({
      requestId: '00112233445566778899aabbccddeeff',
      signature,
      publicKey,
    });

    const decoded = decodeUR(ur);

    expect(ur.toLowerCase()).toMatch(/^ur:btc-signature\//);
    expect(decoded[2]).toEqual(signature);
    expect(decoded[3]).toEqual(publicKey);
  });
});
