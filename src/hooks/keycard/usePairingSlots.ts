import { useCallback, useState } from 'react';
import { Commandset } from 'keycard-sdk/dist/commandset';

import { loadPairing } from '../../storage/pairingStorage';
import { toHex } from '../../utils/hex';
import { useNFCOperation } from './useNFCOperation';

const TOTAL_SLOTS = 10;

export interface SlotInfo {
  totalSlots: number;
  freeSlots: number;
  ourSlotIndex: number | null;
  cardUid: string;
}

export type PairingSlotsPhase = 'idle' | 'checking' | 'ready' | 'error';

export interface UsePairingSlots {
  phase: PairingSlotsPhase;
  slotInfo: SlotInfo | null;
  status: string;
  checkSlots: () => void;
  cancel: () => void;
  reset: () => void;
}

export function usePairingSlots(): UsePairingSlots {
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);

  const handleConnected = useCallback(async (cmdSet: Commandset) => {
    const appInfo = cmdSet.applicationInfo;
    if (!appInfo) {
      throw new Error('No application info in SELECT response');
    }

    const uid = toHex(appInfo.instanceUID);
    const existingPairing = await loadPairing(uid);

    setSlotInfo({
      totalSlots: TOTAL_SLOTS,
      freeSlots: appInfo.freePairingSlots,
      ourSlotIndex: existingPairing?.pairingIndex ?? null,
      cardUid: uid,
    });
  }, []);

  const {
    start,
    cancel: nfcCancel,
    reset: nfcReset,
    phase: nfcPhase,
    status,
  } = useNFCOperation(handleConnected);

  const checkSlots = useCallback(() => {
    setSlotInfo(null);
    start();
  }, [start]);

  const cancel = useCallback(() => {
    nfcCancel();
  }, [nfcCancel]);

  const reset = useCallback(() => {
    setSlotInfo(null);
    nfcReset();
  }, [nfcReset]);

  let phase: PairingSlotsPhase = 'idle';
  if (nfcPhase === 'nfc') {
    phase = 'checking';
  } else if (nfcPhase === 'done' && slotInfo) {
    phase = 'ready';
  } else if (nfcPhase === 'error') {
    phase = 'error';
  }

  return {
    phase,
    slotInfo,
    status,
    checkSlots,
    cancel,
    reset,
  };
}
