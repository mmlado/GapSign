import { useCallback } from 'react';
import { BIP32KeyPair } from 'keycard-sdk/dist/bip32key';
import { Mnemonic } from 'keycard-sdk/dist/mnemonic';

import { useKeycardOperation } from './useKeycardOperation';

export function useLoadKey() {
  const keycard = useKeycardOperation<void>();

  const start = useCallback(
    (keyPair: BIP32KeyPair) => {
      keycard.execute(
        async cmdSet => {
          const appInfo = cmdSet.applicationInfo;
          if (appInfo?.hasMasterKey()) {
            throw new Error('Card already has a key. Factory reset required.');
          }

          const response = await cmdSet.loadBIP32KeyPair(keyPair);
          response.checkOK();
        },
        { requiresPin: true, requiresMasterKey: false },
      );
    },
    [keycard],
  );

  return { ...keycard, start };
}

export function deriveMnemonicKeyPair(
  words: string[],
  passphrase?: string,
): BIP32KeyPair {
  const phrase = words.join(' ');
  const seed = Mnemonic.toBinarySeed(phrase, passphrase);
  return BIP32KeyPair.fromBinarySeed(seed);
}
