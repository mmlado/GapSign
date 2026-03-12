import { useCallback } from 'react';
import { useKeycardOperation } from './useKeycardOperation';
import { Mnemonic } from 'keycard-sdk/dist/mnemonic';
import { BIP32KeyPair } from 'keycard-sdk/dist/bip32key';

export function useLoadKey(words: string[]) {
  const keycard = useKeycardOperation<void>();

  const start = useCallback(() => {
    keycard.execute(
      async cmdSet => {
        const appInfo = cmdSet.applicationInfo;
        if (appInfo?.hasMasterKey()) {
          throw new Error('Card already has a key. Factory reset required.');
        }

        const phrase = words.join(' ');
        const seed = Mnemonic.toBinarySeed(phrase);
        const keyPair = BIP32KeyPair.fromBinarySeed(seed);
        const response = await cmdSet.loadBIP32KeyPair(keyPair);
        response.checkOK();
      },
      { requiresPin: true },
    );
  }, [keycard, words]);

  return { ...keycard, start };
}
