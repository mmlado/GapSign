import { useCallback, useState } from "react";
import { Commandset } from "keycard-sdk/dist/commandset";
import useNFCSession from "./useNFCSession";
import { Phase } from "./useNFCSession";

export type { Phase };

export interface UseNFCOperation<T> {
  phase: Phase;
  status: string;
  result: T | null;
  start: () => void;
  cancel: () => void;
  reset: () => void;
}

export function useNFCOperation<T>(
  onConnected: (cmdSet: Commandset) => Promise<T>,
): UseNFCOperation<T> {
  const [result, setResult] = useState<T | null>(null);

  const handleCardConnected = useCallback(async (cmdSet: Commandset) => {
    const value = await onConnected(cmdSet);
    setResult(value);
  }, [onConnected]);

  const handleCardDisconnected = useCallback(async () => {}, []);

  const { phase, status, startNFC, reset: nfcReset } = useNFCSession(
    handleCardConnected,
    handleCardDisconnected,
  );

  const cancel = useCallback(() => {
    nfcReset();
  }, [nfcReset]);

  const reset = useCallback(() => {
    nfcReset();
    setResult(null);
  }, [nfcReset]);

  return { phase, status, result, start: startNFC, cancel, reset };
}
