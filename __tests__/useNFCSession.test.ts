import React, { act, useCallback } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import useNFCSession from '../src/hooks/keycard/useNFCSession';
import type { UseNFCSessionOperation } from '../src/hooks/keycard/useNFCSession';

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
        return { remove: jest.fn() };
      },
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
  default: {
    Commandset: class {
      select = jest.fn().mockResolvedValue({ sw: 0x9000 });
    },
  },
}));

// ---------------------------------------------------------------------------
// Test wrapper component
// ---------------------------------------------------------------------------

let latestHook: UseNFCSessionOperation;
let mockOnCardConnected: jest.Mock;
let mockOnCardDisconnected: jest.Mock;

function TestHook() {
  latestHook = useNFCSession(
    useCallback(mockOnCardConnected, []),
    useCallback(mockOnCardDisconnected, []),
  );
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

describe('useNFCSession', () => {
  beforeEach(() => {
    mockStartNFC.mockResolvedValue(undefined);
    mockStopNFC.mockResolvedValue(undefined);
    mockStartNFC.mockClear();
    mockStopNFC.mockClear();
    mockOnCardConnected = jest.fn().mockResolvedValue(undefined);
    mockOnCardDisconnected = jest.fn().mockResolvedValue(undefined);
    capturedOnConnected = null;
    capturedOnDisconnected = null;
    capturedOnCancelled = null;
    capturedOnTimeout = null;
  });

  describe('initial state', () => {
    it('starts idle with empty status', async () => {
      await mountHook();
      expect(latestHook.phase).toBe('idle');
      expect(latestHook.status).toBe('');
    });
  });

  describe('startNFC', () => {
    it('transitions to nfc and calls startNFC', async () => {
      await mountHook();
      await act(async () => {
        latestHook.startNFC();
      });
      expect(latestHook.phase).toBe('nfc');
      expect(latestHook.status).toBe('Tap your Keycard');
      expect(mockStartNFC).toHaveBeenCalledWith('Tap your Keycard');
    });
  });

  describe('reset', () => {
    it('returns to idle and stops NFC', async () => {
      await mountHook();
      await act(async () => {
        latestHook.startNFC();
      });
      await act(async () => {
        latestHook.reset();
      });
      expect(latestHook.phase).toBe('idle');
      expect(latestHook.status).toBe('');
      expect(mockStopNFC).toHaveBeenCalled();
    });
  });

  describe('phase guard — card connected', () => {
    it('ignores card connected when phase is idle', async () => {
      await mountHook();
      expect(latestHook.phase).toBe('idle');
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(mockOnCardConnected).not.toHaveBeenCalled();
      expect(latestHook.phase).toBe('idle');
    });

    it('ignores card connected when phase is done', async () => {
      await mountHook();
      // Drive to done by going through nfc phase and completing
      mockOnCardConnected.mockResolvedValue(undefined);
      await act(async () => {
        latestHook.startNFC();
      });
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(latestHook.phase).toBe('done');

      mockOnCardConnected.mockClear();
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(mockOnCardConnected).not.toHaveBeenCalled();
    });

    it('ignores card connected when phase is error', async () => {
      await mountHook();
      mockOnCardConnected.mockRejectedValue(new Error('fail'));
      await act(async () => {
        latestHook.startNFC();
      });
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(latestHook.phase).toBe('error');

      mockOnCardConnected.mockClear();
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(mockOnCardConnected).not.toHaveBeenCalled();
    });

    it('handles card connected when phase is nfc', async () => {
      await mountHook();
      await act(async () => {
        latestHook.startNFC();
      });
      expect(latestHook.phase).toBe('nfc');
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(mockOnCardConnected).toHaveBeenCalledTimes(1);
      expect(latestHook.phase).toBe('done');
    });

    it('sets error phase when onCardConnected throws', async () => {
      await mountHook();
      mockOnCardConnected.mockRejectedValue(new Error('bad mac'));
      await act(async () => {
        latestHook.startNFC();
      });
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(latestHook.phase).toBe('error');
      expect(latestHook.status).toBe('bad mac');
    });
  });

  describe('NFC events', () => {
    it('user-cancelled resets to idle when in nfc phase', async () => {
      await mountHook();
      await act(async () => {
        latestHook.startNFC();
      });
      await act(async () => {
        capturedOnCancelled?.();
      });
      expect(latestHook.phase).toBe('idle');
    });

    it('user-cancelled does not change phase when idle', async () => {
      await mountHook();
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
        latestHook.startNFC();
      });
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(latestHook.phase).toBe('nfc');
      expect(latestHook.status).toBe('Card removed — tap again');
    });

    it('card disconnected outside nfc does not change status', async () => {
      await mountHook();
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(latestHook.phase).toBe('idle');
      expect(latestHook.status).toBe('');
    });
  });
});
