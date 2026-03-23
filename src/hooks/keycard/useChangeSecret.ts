import { useCallback, useRef } from 'react';

import {
  useKeycardOperation,
  UseKeycardOperation,
} from './useKeycardOperation';
import type { SecretType } from '../../navigation/types';

export type UseChangeSecretOperation = Omit<
  UseKeycardOperation<void>,
  'execute'
> & {
  start: (newSecret: string) => void;
};

export function useChangeSecret(
  secretType: SecretType,
): UseChangeSecretOperation {
  const newSecretRef = useRef('');

  const keycard = useKeycardOperation<void>();
  const { execute, ...rest } = keycard;

  const start = useCallback(
    (newSecret: string) => {
      newSecretRef.current = newSecret;
      execute(async cmdSet => {
        let resp;
        if (secretType === 'pin') {
          resp = await cmdSet.changePIN(newSecretRef.current);
        } else if (secretType === 'puk') {
          resp = await cmdSet.changePUK(newSecretRef.current);
        } else {
          resp = await cmdSet.changePairingPassword(newSecretRef.current);
        }
        newSecretRef.current = '';
        resp.checkOK();
      });
    },
    [execute, secretType],
  );

  return { ...rest, start };
}
