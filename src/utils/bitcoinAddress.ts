import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bech32 } from '@scure/base';

// P2WPKH native SegWit (BIP84): RIPEMD160(SHA256(pubKey)) → bech32 "bc1q..."
export function pubKeyToBtcAddress(compressedPubKey: Uint8Array): string {
  const hash160 = ripemd160(sha256(compressedPubKey));
  // witness version 0 prefix byte + hash160
  const words = bech32.toWords(hash160);
  words.unshift(0); // witness version 0
  return bech32.encode('bc', words);
}
