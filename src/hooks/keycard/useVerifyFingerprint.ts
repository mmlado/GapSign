import Keycard from 'keycard-sdk';
import { useCallback } from 'react';

import { pubKeyFingerprint } from '../../utils/cryptoAccount';
import { useKeycardOperation } from './useKeycardOperation';

export type VerifyFingerprintResult = 'match' | 'mismatch';

export function useVerifyFingerprint() {
  const keycard = useKeycardOperation<VerifyFingerprintResult>();

  const start = useCallback(
    (expectedFingerprint: number) => {
      keycard.execute(
        async cmdSet => {
          const resp = await cmdSet.exportKey(0, true, 'm', false);
          resp.checkOK();
          const cardFingerprint = pubKeyFingerprint(
            Keycard.BIP32KeyPair.fromTLV(resp.data).publicKey,
          );

          return expectedFingerprint === cardFingerprint ? 'match' : 'mismatch';
        },
        { requiresPin: true },
      );
    },
    [keycard],
  );

  return { ...keycard, start };
}
