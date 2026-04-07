import { useCallback } from 'react';

import { BIP32KeyPair } from 'keycard-sdk/dist/bip32key';
import { Mnemonic } from 'keycard-sdk/dist/mnemonic';

import { pubKeyFingerprint } from '../../utils/cryptoAccount';
import { parsePublicKeyFromTLV } from '../../utils/keycardExport';
import { useKeycardOperation } from './useKeycardOperation';

export type VerifyMnemonicResult = 'match' | 'mismatch';

export function useVerifyMnemonic(words: string[], passphrase?: string) {
  const keycard = useKeycardOperation<VerifyMnemonicResult>();

  const start = useCallback(() => {
    keycard.execute(
      async cmdSet => {
        const phrase = words.join(' ');
        const seed = Mnemonic.toBinarySeed(phrase, passphrase ?? '');
        const masterKeyPair = BIP32KeyPair.fromBinarySeed(seed);
        const mnemonicFingerprint = pubKeyFingerprint(masterKeyPair.publicKey);

        const resp = await cmdSet.exportKey(0, true, 'm', false);
        resp.checkOK();
        const cardFingerprint = pubKeyFingerprint(
          parsePublicKeyFromTLV(resp.data),
        );

        return mnemonicFingerprint === cardFingerprint ? 'match' : 'mismatch';
      },
      { requiresPin: true },
    );
  }, [keycard, words, passphrase]);

  return { ...keycard, start };
}
