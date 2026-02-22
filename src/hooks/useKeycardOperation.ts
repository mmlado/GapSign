import {useCallback, useEffect, useRef, useState} from 'react';
import RNKeycard from 'react-native-keycard';
import Keycard from 'keycard-sdk';
import {loadPairing, savePairing} from '../storage/pairingStorage';

// Production keycard-shell cards use this raw 32-byte PSK (pass as Uint8Array to autoPair,
// which skips the PBKDF2 derivation used for string passwords).
const PAIRING_PASSWORD = new Uint8Array([
  0x67, 0x5d, 0xea, 0xbb, 0x0d, 0x7c, 0x72, 0x4b,
  0x4a, 0x36, 0xca, 0xad, 0x0e, 0x28, 0x08, 0x26,
  0x15, 0x9e, 0x89, 0x88, 0x6f, 0x70, 0x82, 0x53,
  0x5d, 0x43, 0x1e, 0x92, 0x48, 0x48, 0xbc, 0xf1,
]);

// Test card pairing password (string → PBKDF2 inside autoPair):
// const PAIRING_PASSWORD = 'KeycardTest';

function toHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export type Phase = 'idle' | 'pin_entry' | 'nfc' | 'done' | 'error';

export type KeycardOperationFn<T> = (
  cmdSet: Keycard.Commandset,
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
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<T | null>(null);

  const cmdSetRef = useRef<Keycard.Commandset | null>(null);
  const pinRef = useRef('');
  const operationRef = useRef<KeycardOperationFn<T> | null>(null);
  const requiresPinRef = useRef(true);
  const operationRunningRef = useRef(false);

  const runOperation = useCallback(async () => {
    if (operationRunningRef.current || !operationRef.current || !cmdSetRef.current) {
      return;
    }
    operationRunningRef.current = true;
    setStatus('Processing...');
    try {
      const opResult = await operationRef.current(cmdSetRef.current);
      setResult(opResult);
      setPhase('done');
    } catch (e: any) {
      console.log(`[Keycard] Operation error: ${e.message}`, e);
      setStatus(`Error: ${e.message}`);
      setPhase('error');
      cmdSetRef.current = null;
    } finally {
      operationRunningRef.current = false;
    }
  }, []);

  const handleCardConnected = useCallback(async () => {
    console.log('[Keycard] Card connected');
    try {
      setStatus('Selecting applet...');
      const channel = new RNKeycard.NFCCardChannel();
      const cmdSet = new Keycard.Commandset(channel);
      cmdSetRef.current = cmdSet;

      const selectResp = await cmdSet.select();
      console.log(
        `[Keycard] SELECT SW: 0x${selectResp.sw.toString(16).toUpperCase()}`,
      );
      if (selectResp.sw !== 0x9000) {
        throw new Error(
          `SELECT failed: 0x${selectResp.sw.toString(16).toUpperCase()}`,
        );
      }

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

      await runOperation();
    } catch (e: any) {
      console.log(`[Keycard] Error: ${e.message}`, e);
      setStatus(`Error: ${e.message}`);
      setPhase('error');
      cmdSetRef.current = null;
    }
  }, [runOperation]);

  const handleCardDisconnected = useCallback(() => {
    console.log('[Keycard] Card disconnected');
    cmdSetRef.current = null;
    // Only update status if we're mid-operation (don't clobber done/error).
    setPhase(prev => {
      if (prev === 'nfc') {
        setStatus('Card removed — tap again');
        return 'nfc';
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const connectedSub =
      RNKeycard.Core.onKeycardConnected(handleCardConnected);
    const disconnectedSub = RNKeycard.Core.onKeycardDisconnected(
      handleCardDisconnected,
    );
    const cancelledSub = RNKeycard.Core.onNFCUserCancelled(() => {
      console.log('[Keycard] NFC cancelled by user');
      setPhase(prev => (prev === 'nfc' ? 'idle' : prev));
    });
    const timeoutSub = RNKeycard.Core.onNFCTimeout(() => {
      console.log('[Keycard] NFC timed out');
      setStatus('Timed out — tap again');
    });

    return () => {
      connectedSub.remove();
      disconnectedSub.remove();
      cancelledSub.remove();
      timeoutSub.remove();
      RNKeycard.Core.stopNFC().catch(() => {});
    };
  }, [handleCardConnected, handleCardDisconnected]);

  const execute = useCallback(
    (op: KeycardOperationFn<T>, options: ExecuteOptions = {}) => {
      operationRef.current = op;
      requiresPinRef.current = options.requiresPin ?? true;
      operationRunningRef.current = false;

      if (requiresPinRef.current) {
        setPhase('pin_entry');
      } else {
        setStatus('Tap your Keycard');
        setPhase('nfc');
        RNKeycard.Core.startNFC('Tap your Keycard').catch((err: any) => {
          setStatus(`Failed to start NFC: ${err.message}`);
          setPhase('error');
        });
      }
    },
    [],
  );

  const submitPin = useCallback((pin: string) => {
    pinRef.current = pin;
    setStatus('Tap your Keycard');
    setPhase('nfc');
    RNKeycard.Core.startNFC('Tap your Keycard').catch((err: any) => {
      setStatus(`Failed to start NFC: ${err.message}`);
      setPhase('error');
    });
  }, []);

  const cancel = useCallback(() => {
    RNKeycard.Core.stopNFC().catch(() => {});
    pinRef.current = '';
    operationRef.current = null;
    operationRunningRef.current = false;
    setPhase('idle');
    setStatus('');
  }, []);

  const reset = useCallback(() => {
    RNKeycard.Core.stopNFC().catch(() => {});
    pinRef.current = '';
    operationRef.current = null;
    operationRunningRef.current = false;
    setResult(null);
    setPhase('idle');
    setStatus('');
  }, []);

  return {phase, status, result, execute, submitPin, cancel, reset};
}
