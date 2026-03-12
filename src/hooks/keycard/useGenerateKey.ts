import { useCallback } from 'react';
import { useKeycardOperation } from './useKeycardOperation';
import { Constants } from 'keycard-sdk/dist/constants';
import { Mnemonic } from 'keycard-sdk/dist/mnemonic';
import { wordlist } from '@scure/bip39/wordlists/english.js';

export function useGenerateKey(size: 12 | 24) {
  const keycard = useKeycardOperation<string[]>();

  const start = useCallback(() => {
    const checksum =
      size === 12
        ? Constants.GENERATE_MNEMONIC_12_WORDS
        : Constants.GENERATE_MNEMONIC_24_WORDS;
    keycard.execute(
      async cmdSet => {
        const response = await cmdSet.generateMnemonic(checksum);
        response.checkOK();
        const mnemonic = new Mnemonic(response.data);
        mnemonic.setWordlist(wordlist);
        return mnemonic.getWords();
      },
      { requiresPin: false },
    );
  }, [keycard, size]);

  return { ...keycard, start };
}
