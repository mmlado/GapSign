import { useCallback, useRef, useState } from 'react';
import { Commandset } from 'keycard-sdk/dist/commandset';
import useNFCSession, {
  CardPresence,
  NFCSessionPhase,
  UseNFCSessionOptions,
} from './useNFCSession';

export type { CardPresence };
export type { NFCSessionPhase };
export type { UseNFCSessionOptions };

export interface UseNFCOperation<T> {
  phase: NFCSessionPhase;
  status: string;
  cardPresence: CardPresence;
  result: T | null;
  start: () => void;
  cancel: () => void;
  reset: () => void;
  openNFCSettings: (() => void) | undefined;
  /** See UseNFCSessionOperation.retryUnsafeRef. */
  retryUnsafeRef: { current: boolean };
}

export function useNFCOperation<T>(
  onConnected: (
    cmdSet: Commandset,
    setStatus: (status: string) => void,
  ) => Promise<T>,
  options: UseNFCSessionOptions = {},
): UseNFCOperation<T> {
  const [result, setResult] = useState<T | null>(null);
  const runIdRef = useRef(0);

  const handleCardConnected = useCallback(
    async (cmdSet: Commandset, setStatus: (status: string) => void) => {
      const runId = ++runIdRef.current;
      const value = await onConnected(cmdSet, setStatus);
      if (runId === runIdRef.current) {
        setResult(value);
      }
    },
    [onConnected],
  );

  const handleCardDisconnected = useCallback(async () => {}, []);

  const {
    phase,
    status,
    cardPresence,
    startNFC,
    reset: nfcReset,
    openNFCSettings,
    retryUnsafeRef,
  } = useNFCSession(handleCardConnected, handleCardDisconnected, options);

  const cancel = useCallback(() => {
    runIdRef.current++;
    nfcReset();
  }, [nfcReset]);

  const reset = useCallback(() => {
    runIdRef.current++;
    nfcReset();
    setResult(null);
  }, [nfcReset]);

  return {
    phase,
    status,
    cardPresence,
    result,
    start: startNFC,
    cancel,
    reset,
    openNFCSettings,
    retryUnsafeRef,
  };
}
