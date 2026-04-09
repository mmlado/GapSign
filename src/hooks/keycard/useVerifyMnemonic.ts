import { BIP32KeyPair } from 'keycard-sdk/dist/bip32key';
import { Mnemonic } from 'keycard-sdk/dist/mnemonic';

import { pubKeyFingerprint } from '../../utils/cryptoAccount';

export function deriveMnemonicFingerprint(
  words: string[],
  passphrase = '',
): number {
  const phrase = words.join(' ');
  const seed = Mnemonic.toBinarySeed(phrase, passphrase);
  const masterKeyPair = BIP32KeyPair.fromBinarySeed(seed);
  return pubKeyFingerprint(masterKeyPair.publicKey);
}
