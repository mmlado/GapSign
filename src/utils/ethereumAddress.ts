import { keccak_256 } from '@noble/hashes/sha3';
import * as secp from '@noble/secp256k1';

export function pubKeyToEthAddress(compressedPubKey: Uint8Array): string {
  const uncompressed = secp.Point.fromBytes(compressedPubKey).toBytes(false);
  const hash = keccak_256(uncompressed.slice(1));
  const hex = [...hash.slice(12)]
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
  return toChecksumAddress(hex);
}

function toChecksumAddress(hex: string): string {
  /* eslint-disable no-bitwise */
  const checksumHash = keccak_256(new TextEncoder().encode(hex));
  return (
    '0x' +
    [...hex]
      .map((c, i) => {
        if (c >= '0' && c <= '9') return c;
        const nibble =
          i % 2 === 0
            ? (checksumHash[Math.floor(i / 2)] >> 4) & 0xf
            : checksumHash[Math.floor(i / 2)] & 0xf;
        return nibble >= 8 ? c.toUpperCase() : c.toLowerCase();
      })
      .join('')
  );
}
