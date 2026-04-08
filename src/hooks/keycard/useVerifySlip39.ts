import { useCallback } from 'react';

import { pubKeyFingerprint } from '../../utils/cryptoAccount';
import { parsePublicKeyFromTLV } from '../../utils/keycardExport';
import { recoverSlip39Secret, slip39SecretToKeyPair } from '../../utils/slip39';
import { useKeycardOperation } from './useKeycardOperation';
import type { VerifyMnemonicResult } from './useVerifyMnemonic';

export function useVerifySlip39(shares: string[], passphrase?: string) {
  const keycard = useKeycardOperation<VerifyMnemonicResult>();

  const start = useCallback(() => {
    keycard.execute(
      async cmdSet => {
        const secret = recoverSlip39Secret(shares, passphrase ?? '');
        const keyPair = slip39SecretToKeyPair(secret);
        secret.fill(0);
        const slip39Fingerprint = pubKeyFingerprint(keyPair.publicKey);

        const resp = await cmdSet.exportKey(0, true, 'm', false);
        resp.checkOK();
        const cardFingerprint = pubKeyFingerprint(
          parsePublicKeyFromTLV(resp.data),
        );

        return slip39Fingerprint === cardFingerprint ? 'match' : 'mismatch';
      },
      { requiresPin: true },
    );
  }, [keycard, shares, passphrase]);

  return { ...keycard, start };
}
