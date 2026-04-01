import * as secp from '@noble/secp256k1';
import { getAddress, keccak256 } from 'viem';

export function pubKeyToEthAddress(compressedPubKey: Uint8Array): string {
  const uncompressed = secp.Point.fromBytes(compressedPubKey).toBytes(false);
  const hash = keccak256(uncompressed.slice(1));
  return getAddress(`0x${hash.slice(-40)}`);
}
