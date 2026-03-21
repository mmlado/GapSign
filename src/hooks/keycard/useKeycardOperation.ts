import { useCallback, useRef, useState } from 'react';

import Keycard from 'keycard-sdk';
import { WrongPINException } from 'keycard-sdk/dist/apdu-exception';
import { Commandset } from 'keycard-sdk/dist/commandset';

import { PAIRING_PASSWORD } from '../../constants/keycard';
import { loadPairing, savePairing } from '../../storage/pairingStorage';
import { checkGenuine } from '../../utils/genuineCheck';
import useNFCSession from './useNFCSession';

function toHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export type Phase =
  | 'idle'
  | 'pin_entry'
  | 'nfc'
  | 'genuine_warning'
  | 'done'
  | 'error';

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
  pinError: string | null;
  execute: (op: KeycardOperationFn<T>, options?: ExecuteOptions) => void;
  submitPin: (pin: string) => void;
  clearPinError: () => void;
  cancel: () => void;
  reset: () => void;
  proceedWithNonGenuine: () => void;
}

export function useKeycardOperation<T>(): UseKeycardOperation<T> {
  const [result, setResult] = useState<T | null>(null);
  const [waitingForPin, setWaitingForPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showGenuineWarning, setShowGenuineWarning] = useState(false);

  const pinRef = useRef('');
  const operationRef = useRef<KeycardOperationFn<T> | null>(null);
  const requiresPinRef = useRef(true);
  const operationRunningRef = useRef(false);
  const approvedNonGenuineUidsRef = useRef<Set<string>>(new Set());
  const pendingUidRef = useRef<string | null>(null);

  const handleCardDisconnected = useCallback(async () => {}, []);

  const doPairAndExecute = useCallback(
    async (cmdSet: Commandset, uid: string, setStatus: (s: string) => void) => {
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
        pinRef.current = ''; // clear from memory
        try {
          pinResp.checkAuthOK();
        } catch (e) {
          if (e instanceof WrongPINException) {
            const attempts = e.getRetryAttempts();
            if (attempts === 0) {
              throw new Error('Card is locked. Use Unblock Card option.');
            }
            setPinError(`PIN is not valid. ${attempts} attempts left.`);
          }
          throw e;
        }
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
    },
    [],
  );

  const handleCardConnected = useCallback(
    async (cmdSet: Commandset, setStatus: (status: string) => void) => {
      const appInfo = cmdSet.applicationInfo;
      if (!appInfo) {
        throw new Error('No application info in SELECT response');
      }

      const uid = toHex(appInfo.instanceUID);
      console.log(
        `[Keycard] SELECT OK — UID: ${uid}, initialized: ${appInfo.initializedCard}, ` +
          `freePairingSlots: ${
            appInfo.freePairingSlots
          }, hasMasterKey: ${appInfo.hasMasterKey()}`,
      );

      const existingPairing = await loadPairing(uid);
      if (!existingPairing && !approvedNonGenuineUidsRef.current.has(uid)) {
        setStatus('Verifying card...');
        const isGenuine = await checkGenuine(cmdSet);
        if (!isGenuine) {
          console.log('[Keycard] Genuine check failed — showing warning');
          pendingUidRef.current = uid;
          setShowGenuineWarning(true);
          // Return without throwing: useNFCSession will set nfcPhase='done',
          // but our phase computation overrides it to 'genuine_warning'.
          return;
        }
        console.log('[Keycard] Genuine check passed');
      }

      await doPairAndExecute(cmdSet, uid, setStatus);
    },
    [doPairAndExecute],
  );

  const {
    phase: nfcPhase,
    status,
    startNFC,
    reset: resetNFC,
  } = useNFCSession(handleCardConnected, handleCardDisconnected);

  // 'genuine_warning' takes priority over all other phase overrides.
  const phase: Phase = showGenuineWarning
    ? 'genuine_warning'
    : (waitingForPin && nfcPhase === 'idle') ||
      (pinError !== null && nfcPhase === 'error')
    ? 'pin_entry'
    : nfcPhase;

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

  const submitPin = useCallback(
    (pin: string) => {
      pinRef.current = pin;
      setPinError(null);
      setWaitingForPin(false);
      startNFC();
    },
    [startNFC],
  );

  const clearPinError = useCallback(() => {
    setPinError(null);
  }, []);

  const proceedWithNonGenuine = useCallback(() => {
    const uid = pendingUidRef.current;
    if (uid) {
      approvedNonGenuineUidsRef.current.add(uid);
      pendingUidRef.current = null;
    }
    setShowGenuineWarning(false);
    startNFC(); // Re-enter nfc phase; user taps card again
  }, [startNFC]);

  const cancel = useCallback(() => {
    resetNFC();
    setWaitingForPin(false);
    setPinError(null);
    setShowGenuineWarning(false);
    pendingUidRef.current = null;
    pinRef.current = '';
    operationRef.current = null;
    operationRunningRef.current = false;
  }, [resetNFC]);

  const reset = useCallback(() => {
    resetNFC();
    setWaitingForPin(false);
    setPinError(null);
    setShowGenuineWarning(false);
    pendingUidRef.current = null;
    pinRef.current = '';
    operationRef.current = null;
    operationRunningRef.current = false;
    setResult(null);
  }, [resetNFC]);

  return {
    phase,
    status,
    result,
    pinError,
    execute,
    submitPin,
    clearPinError,
    cancel,
    reset,
    proceedWithNonGenuine,
  };
}
