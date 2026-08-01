import { HDKey } from '@scure/bip32';
import Keycard from 'keycard-sdk';
import { useCallback } from 'react';

import { ACCOUNT_PATHS } from '@/utils/hdAddress';

import { useKeycardOp } from './useKeycardOperation';

export function useAddresses(coin: 'eth' | 'btc') {
  const path = ACCOUNT_PATHS[coin];

  return useKeycardOp<HDKey>(
    useCallback(
      async cmdSet => {
        const resp = await cmdSet.exportExtendedKey(0, path, false);
        resp.checkOK();
        return Keycard.BIP32KeyPair.extendedKey(resp.data);
      },
      [path],
    ),
    { requiresPin: true },
  );
}
