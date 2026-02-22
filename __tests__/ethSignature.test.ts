/* eslint-disable no-bitwise */
import * as secp from '@noble/secp256k1';
import {URDecoder} from '@ngraveio/bc-ur';
import CBOR from 'cbor-sync';
import {buildEthSignatureUR} from '../src/utils/ethSignature';

// ── TLV builder helpers ──────────────────────────────────────────────────────

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
): string {
  const sequence = tlvEncode(0x30, concatBytes(derInt(r), derInt(s)));
  const inner = concatBytes(tlvEncode(0x80, pubKey), sequence);
  const template = tlvEncode(0xa0, inner);
  return Array.from(template)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Decode a single-part UR string back to a CBOR map ───────────────────────

function decodeUR(urString: string): Record<number, any> {
  const decoder = new URDecoder();
  decoder.receivePart(urString);
  return CBOR.decode(decoder.resultUR().cbor);
}

// ── Shared test fixture ──────────────────────────────────────────────────────

// Private key = 1 (smallest valid secp256k1 scalar)
const PRIV_KEY = new Uint8Array(32);
PRIV_KEY[31] = 1;

const HASH = new Uint8Array(32).fill(0xab);

// ── Tests ────────────────────────────────────────────────────────────────────

describe('buildEthSignatureUR', () => {
  let tlvHex: string;
  let recId: number;

  beforeAll(async () => {
    // signAsync uses WebCrypto HMAC-SHA256 (available in Node 18+).
    // format: 'recovered' returns [recId(1), r(32), s(32)] = 65 bytes.
    // extraEntropy: false makes signing deterministic (RFC6979).
    const sigBytes = await secp.signAsync(HASH, PRIV_KEY, {
      prehash: false,
      format: 'recovered',
      extraEntropy: false,
    });
    recId = sigBytes[0];
    const r = sigBytes.slice(1, 33);
    const s = sigBytes.slice(33, 65);
    const pubKey = secp.getPublicKey(PRIV_KEY, false); // 65-byte uncompressed
    tlvHex = buildSignatureTLV(pubKey, r, s);
  });

  it('returns a ur:eth-signature string', () => {
    const ur = buildEthSignatureUR(tlvHex, HASH, 4, undefined, undefined);
    expect(ur.toLowerCase()).toMatch(/^ur:eth-signature\//);
  });

  describe('v calculation by dataType', () => {
    it('EIP-1559 (dataType=4): v equals recId (0 or 1)', () => {
      const ur = buildEthSignatureUR(tlvHex, HASH, 4, undefined, undefined);
      const sig: Buffer = decodeUR(ur)[2];
      expect(sig[sig.length - 1]).toBe(recId);
    });

    it('legacy transaction (dataType=1, chainId=1): v = 37 + recId', () => {
      const ur = buildEthSignatureUR(tlvHex, HASH, 1, 1, undefined);
      const sig: Buffer = decodeUR(ur)[2];
      expect(sig[sig.length - 1]).toBe(37 + recId);
    });

    it('EIP-712 (dataType=2): v = 27 + recId', () => {
      const ur = buildEthSignatureUR(tlvHex, HASH, 2, undefined, undefined);
      const sig: Buffer = decodeUR(ur)[2];
      expect(sig[sig.length - 1]).toBe(27 + recId);
    });

    it('personal_sign (dataType=3): v = 27 + recId', () => {
      const ur = buildEthSignatureUR(tlvHex, HASH, 3, undefined, undefined);
      const sig: Buffer = decodeUR(ur)[2];
      expect(sig[sig.length - 1]).toBe(27 + recId);
    });

    it('undefined dataType falls back to v = 27 + recId', () => {
      const ur = buildEthSignatureUR(tlvHex, HASH, undefined, undefined, undefined);
      const sig: Buffer = decodeUR(ur)[2];
      expect(sig[sig.length - 1]).toBe(27 + recId);
    });
  });

  describe('CBOR map structure', () => {
    it('always includes signature (key 2) and origin "GapSign" (key 3)', () => {
      const ur = buildEthSignatureUR(tlvHex, HASH, 4, undefined, undefined);
      const decoded = decodeUR(ur);
      expect(Buffer.isBuffer(decoded[2])).toBe(true);
      expect(decoded[3]).toBe('GapSign');
    });

    it('signature is 65 bytes (r || s || v) for single-byte v values', () => {
      const ur = buildEthSignatureUR(tlvHex, HASH, 4, undefined, undefined);
      const sig: Buffer = decodeUR(ur)[2];
      expect(sig.length).toBe(65);
    });

    it('includes requestId (key 1) when provided', () => {
      const ur = buildEthSignatureUR(
        tlvHex,
        HASH,
        4,
        undefined,
        '0102030405060708090a0b0c0d0e0f10',
      );
      const decoded = decodeUR(ur);
      expect(decoded[1]).toBeDefined();
    });

    it('omits requestId (key 1) when not provided', () => {
      const ur = buildEthSignatureUR(tlvHex, HASH, 4, undefined, undefined);
      const decoded = decodeUR(ur);
      expect(decoded[1]).toBeUndefined();
    });
  });

  it('throws on malformed TLV', () => {
    expect(() =>
      buildEthSignatureUR('deadbeef', HASH, 4, undefined, undefined),
    ).toThrow();
  });
});
