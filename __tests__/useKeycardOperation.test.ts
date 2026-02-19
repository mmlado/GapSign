import React, {act} from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {useKeycardOperation} from '../src/hooks/useKeycardOperation';
import type {UseKeycardOperation} from '../src/hooks/useKeycardOperation';

// ---------------------------------------------------------------------------
// RNKeycard mock — captures event callbacks so tests can trigger them
// ---------------------------------------------------------------------------

let capturedOnConnected: (() => Promise<void>) | null = null;
let capturedOnDisconnected: (() => void) | null = null;
let capturedOnCancelled: (() => void) | null = null;
let capturedOnTimeout: (() => void) | null = null;

const mockStartNFC = jest.fn();
const mockStopNFC = jest.fn();

jest.mock('react-native-keycard', () => ({
  __esModule: true,
  default: {
    Core: {
      onKeycardConnected: (cb: () => Promise<void>) => {
        capturedOnConnected = cb;
        return {remove: jest.fn()};
      },
      onKeycardDisconnected: (cb: () => void) => {
        capturedOnDisconnected = cb;
        return {remove: jest.fn()};
      },
      onNFCUserCancelled: (cb: () => void) => {
        capturedOnCancelled = cb;
        return {remove: jest.fn()};
      },
      onNFCTimeout: (cb: () => void) => {
        capturedOnTimeout = cb;
        return {remove: jest.fn()};
      },
      startNFC: (msg: string) => mockStartNFC(msg),
      stopNFC: () => mockStopNFC(),
    },
    NFCCardChannel: class {},
  },
}));

jest.mock('keycard-sdk', () => ({
  __esModule: true,
  default: {Commandset: class {}},
}));

jest.mock('../src/storage/pairingStorage', () => ({
  loadPairing: jest.fn(),
  savePairing: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Test wrapper component
// ---------------------------------------------------------------------------

let latestHook: UseKeycardOperation<string>;

function TestHook() {
  latestHook = useKeycardOperation<string>();
  return null;
}

async function mountHook() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(React.createElement(TestHook));
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useKeycardOperation', () => {
  beforeEach(() => {
    mockStartNFC.mockResolvedValue(undefined);
    mockStopNFC.mockResolvedValue(undefined);
    mockStartNFC.mockClear();
    mockStopNFC.mockClear();
    capturedOnConnected = null;
    capturedOnDisconnected = null;
    capturedOnCancelled = null;
    capturedOnTimeout = null;
  });

  describe('initial state', () => {
    it('starts idle with empty status and no result', async () => {
      await mountHook();
      expect(latestHook.phase).toBe('idle');
      expect(latestHook.status).toBe('');
      expect(latestHook.result).toBeNull();
    });
  });

  describe('execute', () => {
    it('transitions to pin_entry when requiresPin is true', async () => {
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), {requiresPin: true});
      });
      expect(latestHook.phase).toBe('pin_entry');
    });

    it('transitions to nfc and calls startNFC when requiresPin is false', async () => {
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), {requiresPin: false});
      });
      expect(latestHook.phase).toBe('nfc');
      expect(mockStartNFC).toHaveBeenCalledWith('Tap your Keycard');
    });

    it('defaults requiresPin to true when options are omitted', async () => {
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn());
      });
      expect(latestHook.phase).toBe('pin_entry');
      expect(mockStartNFC).not.toHaveBeenCalled();
    });
  });

  describe('submitPin', () => {
    it('transitions to nfc and calls startNFC', async () => {
      await mountHook();
      await act(async () => {
        latestHook.submitPin('123456');
      });
      expect(latestHook.phase).toBe('nfc');
      expect(mockStartNFC).toHaveBeenCalledWith('Tap your Keycard');
    });
  });

  describe('cancel', () => {
    it('returns to idle, clears status, and stops NFC', async () => {
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), {requiresPin: true});
      });
      await act(async () => {
        latestHook.cancel();
      });
      expect(latestHook.phase).toBe('idle');
      expect(latestHook.status).toBe('');
      expect(mockStopNFC).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('returns to idle, clears result, and stops NFC', async () => {
      await mountHook();
      await act(async () => {
        latestHook.reset();
      });
      expect(latestHook.phase).toBe('idle');
      expect(latestHook.status).toBe('');
      expect(latestHook.result).toBeNull();
      expect(mockStopNFC).toHaveBeenCalled();
    });
  });

  describe('NFC events', () => {
    it('user-cancelled resets to idle when in nfc phase', async () => {
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), {requiresPin: false});
      });
      expect(latestHook.phase).toBe('nfc');

      await act(async () => {
        capturedOnCancelled?.();
      });
      expect(latestHook.phase).toBe('idle');
    });

    it('user-cancelled does not change phase when not in nfc', async () => {
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), {requiresPin: true});
      });
      expect(latestHook.phase).toBe('pin_entry');

      await act(async () => {
        capturedOnCancelled?.();
      });
      expect(latestHook.phase).toBe('pin_entry');
    });

    it('timeout updates status message', async () => {
      await mountHook();
      await act(async () => {
        capturedOnTimeout?.();
      });
      expect(latestHook.status).toBe('Timed out — tap again');
    });

    it('card disconnected during nfc updates status and stays in nfc', async () => {
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), {requiresPin: false});
      });
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(latestHook.phase).toBe('nfc');
      expect(latestHook.status).toBe('Card removed — tap again');
    });

    it('card disconnected outside nfc does not update status', async () => {
      await mountHook();
      // phase is idle — disconnect should be a no-op for status
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(latestHook.phase).toBe('idle');
      expect(latestHook.status).toBe('');
    });
  });
});
