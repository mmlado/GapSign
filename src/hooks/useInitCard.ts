import { useCallback, useRef } from 'react';
import { Commandset } from 'keycard-sdk/dist/commandset';
import { PAIRING_PASSWORD } from '../constants/keycard';
import { useNFCOperation } from './useNFCOperation';
import { Phase } from './useNFCSession';

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
  return Array.from(bytes)
    .map(b => b % 10)
    .join('');
}

export function useInitCard(): UseInitCardOperation {
  const pinRef = useRef('');
  const duressPinRef = useRef<string | null>(null);

  const {
    phase,
    status,
    result,
    start: startNFC,
    cancel,
    reset,
  } = useNFCOperation(
    useCallback(async (cmdSet: Commandset) => {
      if (cmdSet.applicationInfo?.initializedCard) {
        throw new Error(
          'This card is already set up. Use a blank card to initialize.',
        );
      }
      const puk = generatePUK();
      await cmdSet.init(
        pinRef.current,
        puk,
        PAIRING_PASSWORD,
        duressPinRef.current || undefined,
      );
      pinRef.current = '';
      duressPinRef.current = null;
      return puk;
    }, []),
  );

  const start = useCallback(
    (pin: string, duressPin?: string | null) => {
      pinRef.current = pin;
      duressPinRef.current = duressPin || null;
      startNFC();
    },
    [startNFC],
  );

  return { phase, status, result, start, cancel, reset };
}
