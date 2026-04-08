import { useCallback } from 'react';

import { Constants } from 'keycard-sdk/dist/constants';

import { validateSlip39GenerationArgs } from '../../utils/slip39';
import { useKeycardOperation } from './useKeycardOperation';

const SHELL_SLIP39_ENTROPY_WORD_COUNT = Constants.GENERATE_MNEMONIC_18_WORDS;

export function useGenerateSlip39Shares(shareCount: number, threshold: number) {
  const keycard = useKeycardOperation<Uint8Array>();

  const start = useCallback(() => {
    validateSlip39GenerationArgs({ shareCount, threshold });
    keycard.execute(
      async (cmdSet, { setStatus }) => {
        setStatus('Reading Keycard entropy...');
        const response = await cmdSet.generateMnemonic(
          SHELL_SLIP39_ENTROPY_WORD_COUNT,
        );
        response.checkOK();
        return response.data;
      },
      { requiresPin: false },
    );
  }, [keycard, shareCount, threshold]);

  return { ...keycard, start };
}
