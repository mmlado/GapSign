import Keycard from 'keycard-sdk';
import { Commandset } from 'keycard-sdk/dist/commandset';
import { useCallback, useEffect, useState } from 'react';
import RNKeycard from 'react-native-keycard';

export type Phase = 'idle' | 'nfc' | 'done' | 'error';

export interface UseNFCSessionOperation {
  phase: Phase;
  status: string;
  startNFC: () => void;
  reset: () => void;
}

export default function useNFCSession(
  onCardConnected: (
    cmdSet: Commandset,
    setStatus: (status: string) => void,
  ) => Promise<void>,
  onCardDisconnected: () => Promise<void>,
): UseNFCSessionOperation {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('');

  const handleCardConnected = useCallback(async () => {
    console.log('[Keycard] Card connected');
    try {
      setStatus('Selecting applet...');
      const channel = new RNKeycard.NFCCardChannel();
      const cmdSet = new Keycard.Commandset(channel);

      const selectResp = await cmdSet.select();
      console.log(
        `[Keycard] SELECT SW: 0x${selectResp.sw.toString(16).toUpperCase()}`,
      );
      if (selectResp.sw !== 0x9000) {
        throw new Error(
          `SELECT failed: 0x${selectResp.sw.toString(16).toUpperCase()}`,
        );
      }

      await onCardConnected(cmdSet, setStatus);
      setPhase('done');
    } catch (e: any) {
      console.log(`[Keycard] Error: ${e.message}`, e);
      setStatus(`Error: ${e.message}`);
      setPhase('error');
    }
  }, [onCardConnected]);

  const handleCardDisconnected = useCallback(() => {
    console.log('[Keycard] Card disconnected');
    onCardDisconnected();
    // Only update status if we're mid-operation (don't clobber done/error).
    setPhase(prev => {
      if (prev === 'nfc') {
        setStatus('Card removed — tap again');
        return 'nfc';
      }
      return prev;
    });
  }, [onCardDisconnected]);

  useEffect(() => {
    const connectedSub = RNKeycard.Core.onKeycardConnected(handleCardConnected);
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

  const startNFC = useCallback(() => {
    setStatus('Tap your Keycard');
    setPhase('nfc');
    RNKeycard.Core.startNFC('Tap your Keycard').catch((err: any) => {
      setStatus(`Failed to start NFC: ${err.message}`);
      setPhase('error');
    });
  }, []);

  const reset = useCallback(() => {
    RNKeycard.Core.stopNFC().catch(() => {});
    setPhase('idle');
    setStatus('');
  }, []);

  return { phase, status, startNFC, reset };
}
