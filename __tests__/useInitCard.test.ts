import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useInitCard } from '../src/hooks/keycard/useInitCard';
import type { UseInitCardOperation } from '../src/hooks/keycard/useInitCard';

// ---------------------------------------------------------------------------
// RNKeycard mock — captures event callbacks so tests can trigger them
// ---------------------------------------------------------------------------

let capturedOnDisconnected: (() => void) | null = null;
let capturedOnCancelled: (() => void) | null = null;
let capturedOnTimeout: (() => void) | null = null;

const mockStartNFC = jest.fn();
const mockStopNFC = jest.fn();

jest.mock('react-native-keycard', () => ({
  __esModule: true,
  default: {
    Core: {
      onKeycardConnected: (_cb: () => Promise<void>) => ({ remove: jest.fn() }),
      onKeycardDisconnected: (cb: () => void) => {
        capturedOnDisconnected = cb;
        return { remove: jest.fn() };
      },
      onNFCUserCancelled: (cb: () => void) => {
        capturedOnCancelled = cb;
        return { remove: jest.fn() };
      },
      onNFCTimeout: (cb: () => void) => {
        capturedOnTimeout = cb;
        return { remove: jest.fn() };
      },
      startNFC: (msg: string) => mockStartNFC(msg),
      stopNFC: () => mockStopNFC(),
    },
    NFCCardChannel: class {},
  },
}));

jest.mock('keycard-sdk', () => ({
  __esModule: true,
  default: { Commandset: class {} },
}));

// ---------------------------------------------------------------------------
// Test wrapper component
// ---------------------------------------------------------------------------

let latestHook: UseInitCardOperation;

function TestHook() {
  latestHook = useInitCard();
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

describe('useInitCard', () => {
  beforeEach(() => {
    mockStartNFC.mockResolvedValue(undefined);
    mockStopNFC.mockResolvedValue(undefined);
    mockStartNFC.mockClear();
    mockStopNFC.mockClear();
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

  describe('start', () => {
    it('transitions to nfc and calls startNFC', async () => {
      await mountHook();
      await act(async () => {
        latestHook.start('123456');
      });
      expect(latestHook.phase).toBe('nfc');
      expect(mockStartNFC).toHaveBeenCalledWith('Tap your Keycard');
    });

    it('sets status to "Tap your Keycard"', async () => {
      await mountHook();
      await act(async () => {
        latestHook.start('123456');
      });
      expect(latestHook.status).toBe('Tap your Keycard');
    });
  });

  describe('cancel', () => {
    it('returns to idle, clears status, and stops NFC', async () => {
      await mountHook();
      await act(async () => {
        latestHook.start('123456');
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
        latestHook.start('123456');
      });
      expect(latestHook.phase).toBe('nfc');

      await act(async () => {
        capturedOnCancelled?.();
      });
      expect(latestHook.phase).toBe('idle');
    });

    it('user-cancelled does not change phase when idle', async () => {
      await mountHook();
      expect(latestHook.phase).toBe('idle');
      await act(async () => {
        capturedOnCancelled?.();
      });
      expect(latestHook.phase).toBe('idle');
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
        latestHook.start('123456');
      });
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(latestHook.phase).toBe('nfc');
      expect(latestHook.status).toBe('Card removed — tap again');
    });

    it('card disconnected outside nfc does not update status', async () => {
      await mountHook();
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(latestHook.phase).toBe('idle');
      expect(latestHook.status).toBe('');
    });
  });
});
