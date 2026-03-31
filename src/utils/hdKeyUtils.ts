/* eslint-disable no-bitwise */
import { CryptoKeypath, PathComponent } from '@keystonehq/bc-ur-registry';
import Keycard from 'keycard-sdk';

const TLV_KEY_TEMPLATE = 0xa1;
const TLV_PUB_KEY = 0x80;
const TLV_CHAIN_CODE = 0x82;
const SCALAR_BYTES = 32;

export function compressPubKey(uncompressed: Uint8Array): Buffer {
  const x = uncompressed.slice(1, 1 + SCALAR_BYTES);
  const y = uncompressed.slice(1 + SCALAR_BYTES);
  const prefix = (y[SCALAR_BYTES - 1] & 1) === 0 ? 0x02 : 0x03;
  return Buffer.concat([Buffer.from([prefix]), Buffer.from(x)]);
}

export function numberToFingerprintBuffer(fingerprint: number): Buffer {
  return Buffer.from([
    (fingerprint >>> 24) & 0xff,
    (fingerprint >>> 16) & 0xff,
    (fingerprint >>> 8) & 0xff,
    fingerprint & 0xff,
  ]);
}

export function derivationPathToKeypath(
  derivationPath: string,
  sourceFingerprint: number,
): CryptoKeypath {
  const components = derivationPath
    .split('/')
    .slice(1)
    .map(part => {
      const hardened = part.endsWith("'");
      const index = parseInt(hardened ? part.slice(0, -1) : part, 10);
      return new PathComponent({ index, hardened });
    });

  return new CryptoKeypath(
    components,
    numberToFingerprintBuffer(sourceFingerprint),
    components.length,
  );
}

export function coinTypeFromPath(derivationPath: string): number {
  const match = derivationPath.match(/^m\/\d+'\/(\d+)'/);
  return match ? parseInt(match[1], 10) : 0;
}

export function parseKeyFromTLV(data: Uint8Array): {
  pubKeyUncompressed: Uint8Array;
  chainCode: Uint8Array;
} {
  const tlv = new Keycard.BERTLV(data);
  tlv.enterConstructed(TLV_KEY_TEMPLATE);
  const pubKeyUncompressed = tlv.readPrimitive(TLV_PUB_KEY);
  const chainCode = tlv.readPrimitive(TLV_CHAIN_CODE);
  return { pubKeyUncompressed, chainCode };
}

export function parseExtendedKeyFromTLV(data: Uint8Array): {
  pubKeyUncompressed: Uint8Array;
  chainCode: Uint8Array;
} {
  let position = 0;

  function readTag(): number {
    return data[position++];
  }

  function readLength(): number {
    let len = data[position++];
    if (len === 0x81) {
      len = data[position++];
    }
    return len;
  }

  function expectTag(tag: number) {
    const actual = readTag();
    if (actual !== tag) {
      throw new Error(
        `Expected tag 0x${tag.toString(16)}, got 0x${actual.toString(16)}`,
      );
    }
  }

  expectTag(TLV_KEY_TEMPLATE);
  const templateLen = readLength();
  const templateEnd = position + templateLen;

  expectTag(TLV_PUB_KEY);
  const pubKeyLen = readLength();
  const pubKey = data.slice(position, position + pubKeyLen);
  position += pubKeyLen;

  expectTag(TLV_CHAIN_CODE);
  const chainCodeLen = readLength();
  const chainCode = data.slice(position, position + chainCodeLen);
  position += chainCodeLen;

  if (position !== templateEnd) {
    throw new Error('Unexpected trailing data in exported key TLV');
  }

  return { pubKeyUncompressed: pubKey, chainCode };
}
