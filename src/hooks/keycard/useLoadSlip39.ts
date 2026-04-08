import { useCallback } from 'react';

import { recoverSlip39Secret, slip39SecretToKeyPair } from '../../utils/slip39';
import { useKeycardOperation } from './useKeycardOperation';

export function useLoadSlip39(shares: string[], passphrase?: string) {
  const keycard = useKeycardOperation<void>();

  const start = useCallback(() => {
    keycard.execute(
      async cmdSet => {
        const appInfo = cmdSet.applicationInfo;
        if (appInfo?.hasMasterKey()) {
          throw new Error('Card already has a key. Factory reset required.');
        }

        const secret = recoverSlip39Secret(shares, passphrase ?? '');
        const keyPair = slip39SecretToKeyPair(secret);
        secret.fill(0);
        const response = await cmdSet.loadBIP32KeyPair(keyPair);
        response.checkOK();
      },
      { requiresPin: true },
    );
  }, [keycard, shares, passphrase]);

  return { ...keycard, start };
}
