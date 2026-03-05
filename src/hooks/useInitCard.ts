import { useCallback, useEffect, useRef, useState } from "react";
import useNFCSession from "./useNFCSession";
import { PAIRING_PASSWORD } from "../constants/keycard";
import { Commandset } from "keycard-sdk/dist/commandset";
import { Phase } from "./useKeycardOperation";

export interface UseInitCardOperation {
  phase: Phase;
  status: string;
  result: string | null;
  start: (pin: string, duressPin?: string | null) => void;
  cancel: () => void;
  reset: () => void;
}

function generatePUK(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b % 10).join('');
}

export function useInitCard(): UseInitCardOperation {
  const [result, setResult] = useState<string | null>(null);

  const pinRef = useRef('');
  const duressPinRef = useRef<string | null>(null);

  const handleCardConnected = useCallback(async (cmdSet: Commandset) => {
      const puk = generatePUK();
      await cmdSet.init(pinRef.current, puk, PAIRING_PASSWORD, duressPinRef.current || undefined)
      setResult(puk);
  }, []);

  const handleCardDisconnected = useCallback(async () => {
    pinRef.current = '';
    duressPinRef.current = null;
  }, []);

  const { phase, status, startNFC, reset: nfcReset} = useNFCSession(
    handleCardConnected,
    handleCardDisconnected)
  ;

  const start = useCallback((pin: string, duressPin?: string | null) => {
    pinRef.current = pin;
    duressPinRef.current = duressPin || null;
    startNFC();
  }, []);

  const cancel = useCallback(() => {
    nfcReset();
    pinRef.current = '';
  }, []);

  const reset = useCallback(() => {
    nfcReset();
    pinRef.current = '';
    setResult(null);
  }, []);

  return {phase, status, result, start, cancel, reset};
}
