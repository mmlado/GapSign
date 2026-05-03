import { useCallback } from 'react';

import {
  mergeKeycardNameMetadata,
  validateKeycardName,
} from '../../utils/keycardName';
import { useKeycardOperation } from './useKeycardOperation';

export function useSetCardName() {
  const keycard = useKeycardOperation<void>();

  const start = useCallback(
    (name: string) => {
      validateKeycardName(name);
      keycard.execute(
        async (cmdSet, { setStatus }) => {
          const dataResp = await cmdSet.getData(0x00);
          if (dataResp.sw !== 0x9000) {
            throw new Error(
              `GET DATA failed: 0x${dataResp.sw.toString(16).toUpperCase()}`,
            );
          }

          setStatus('Writing card name...');
          const metadata = mergeKeycardNameMetadata(name, dataResp.data);
          const resp = await cmdSet.storeData(metadata, 0x00);
          if (resp.sw !== 0x9000) {
            throw new Error(
              `STORE DATA failed: 0x${resp.sw.toString(16).toUpperCase()}`,
            );
          }
        },
        { requiresPin: true, requiresMasterKey: false },
      );
    },
    [keycard],
  );

  return { ...keycard, start };
}
