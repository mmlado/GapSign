import { useCallback } from "react";
import { Commandset } from "keycard-sdk/dist/commandset";
import { useNFCOperation } from "./useNFCOperation";
import { Phase } from "./useNFCSession";

export interface UseFactoryResetOperation {
  phase: Phase;
  status: string;
  result: string | null;
  start: () => void;
  cancel: () => void;
  reset: () => void;
}

export function useFactoryReset(): UseFactoryResetOperation {
  const { phase, status, result, start, cancel, reset } = useNFCOperation(
    useCallback(async (cmdSet: Commandset) => {
      if (!cmdSet.applicationInfo?.initializedCard) {
        throw new Error('This card is already empty.');
      }
      await cmdSet.factoryReset();
      return "";
    }, [])
  );

  return { phase, status, result, start, cancel, reset };
}
