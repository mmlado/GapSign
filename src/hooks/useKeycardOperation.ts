import {useCallback, useRef, useState} from 'react';
import Keycard from 'keycard-sdk';
import {loadPairing, savePairing} from '../storage/pairingStorage';
import useNFCSession from './useNFCSession';
import { Commandset } from 'keycard-sdk/dist/commandset';
import { PAIRING_PASSWORD } from '../constants/keycard';

function toHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export type Phase = 'idle' | 'pin_entry' | 'nfc' | 'done' | 'error';

export type KeycardOperationFn<T> = (
  cmdSet: InstanceType<typeof Keycard.Commandset>,
) => Promise<T>;

export interface ExecuteOptions {
  requiresPin?: boolean;
}

export interface UseKeycardOperation<T> {
  phase: Phase;
  status: string;
  result: T | null;
  execute: (op: KeycardOperationFn<T>, options?: ExecuteOptions) => void;
  submitPin: (pin: string) => void;
  cancel: () => void;
  reset: () => void;
}

export function useKeycardOperation<T>(): UseKeycardOperation<T> {
  const [result, setResult] = useState<T | null>(null);
  const [waitingForPin, setWaitingForPin] = useState(false);

  const pinRef = useRef('');
  const operationRef = useRef<KeycardOperationFn<T> | null>(null);
  const requiresPinRef = useRef(true);
  const operationRunningRef = useRef(false);

  const handleCardDisconnected = useCallback(async () => {
  }, []);

  const handleCardConnected = useCallback(async (cmdSet: Commandset, setStatus: (status: string) => void) => {
    const appInfo = cmdSet.applicationInfo;
    if (!appInfo) {
      throw new Error('No application info in SELECT response');
    }

    const uid = toHex(appInfo.instanceUID);
    console.log(
      `[Keycard] SELECT OK — UID: ${uid}, initialized: ${appInfo.initializedCard}, ` +
        `freePairingSlots: ${appInfo.freePairingSlots}, hasMasterKey: ${appInfo.hasMasterKey()}`,
    );

    const existingPairing = await loadPairing(uid);
    if (existingPairing) {
      console.log(
        `[Keycard] Pairing found in storage (index: ${existingPairing.pairingIndex})`,
      );
      cmdSet.setPairing(existingPairing);
      setStatus('Opening secure channel...');
    } else {
      console.log('[Keycard] No pairing found — running autoPair');
      setStatus('Pairing with card...');
      await cmdSet.autoPair(PAIRING_PASSWORD);
      const pairing = cmdSet.getPairing();
      console.log(
        `[Keycard] autoPair OK (index: ${pairing.pairingIndex}) — saving to storage`,
      );
      await savePairing(uid, pairing);
      setStatus('Opening secure channel...');
    }

    await cmdSet.autoOpenSecureChannel();
    console.log('[Keycard] Secure channel open');

    if (requiresPinRef.current) {
      setStatus('Verifying PIN...');
      const pinResp = await cmdSet.verifyPIN(pinRef.current);
      console.log(
        `[Keycard] verifyPIN SW: 0x${pinResp.sw.toString(16).toUpperCase()}`,
      );
      pinResp.checkAuthOK();
      pinRef.current = ''; // clear from memory
    }

    if (operationRunningRef.current || !operationRef.current) {
      return;
    }
    operationRunningRef.current = true;
    setStatus('Processing...');
    try {
      const opResult = await operationRef.current(cmdSet);
      setResult(opResult);
    } finally {
      operationRunningRef.current = false;
    }
  }, []);

  const {phase: nfcPhase, status, startNFC, reset: resetNFC} = useNFCSession(handleCardConnected, handleCardDisconnected);

  // Overlay pin_entry on top of the NFC session phases.
  const phase: Phase = waitingForPin && nfcPhase === 'idle' ? 'pin_entry' : nfcPhase;

  const execute = useCallback(
    (op: KeycardOperationFn<T>, options: ExecuteOptions = {}) => {
      operationRef.current = op;
      requiresPinRef.current = options.requiresPin ?? true;
      operationRunningRef.current = false;

      if (!requiresPinRef.current) {
        startNFC();
      } else {
        setWaitingForPin(true);
      }
    },
    [startNFC],
  );

  const submitPin = useCallback((pin: string) => {
    pinRef.current = pin;
    setWaitingForPin(false);
    startNFC();
  }, [startNFC]);

  const cancel = useCallback(() => {
    resetNFC();
    setWaitingForPin(false);
    pinRef.current = '';
    operationRef.current = null;
    operationRunningRef.current = false;
  }, [resetNFC]);

  const reset = useCallback(() => {
    resetNFC();
    setWaitingForPin(false);
    pinRef.current = '';
    operationRef.current = null;
    operationRunningRef.current = false;
    setResult(null);
  }, [resetNFC]);

  return {phase, status, result, execute, submitPin, cancel, reset};
}
