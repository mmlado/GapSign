import { HDKey } from '@scure/bip32';
import Keycard from 'keycard-sdk';
import { useCallback } from 'react';

import { useKeycardOperation } from './useKeycardOperation';

const COIN_CONFIG = {
  eth: { path: "m/44'/60'/0'" },
  btc: { path: "m/84'/0'/0'" },
};

export function useAddresses(coin: 'eth' | 'btc') {
  const keycard = useKeycardOperation<HDKey>();
  const { path } = COIN_CONFIG[coin];

  const start = useCallback(() => {
    keycard.execute(
      async cmdSet => {
        const resp = await cmdSet.exportExtendedKey(0, path, false);
        resp.checkOK();
        return Keycard.BIP32KeyPair.extendedKey(resp.data);
      },
      { requiresPin: true },
    );
  }, [keycard, path]);

  return { ...keycard, start };
}
