import { act, renderHook } from '@testing-library/react-native';
import { useCallback } from 'react';
import useNFCSession from '../src/hooks/keycard/useNFCSession';

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
// Tests
// ---------------------------------------------------------------------------

describe('useNFCSession', () => {
  let mockOnCardConnected: jest.Mock;
  let mockOnCardDisconnected: jest.Mock;

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

  function makeHook() {
    return renderHook(() =>
      useNFCSession(
        useCallback(mockOnCardConnected, []),
        useCallback(mockOnCardDisconnected, []),
      ),
    );
  }

  describe('initial state', () => {
    it('starts idle with empty status', () => {
      const { result } = makeHook();
      expect(result.current.phase).toBe('idle');
      expect(result.current.status).toBe('');
    });
  });

  describe('startNFC', () => {
    it('transitions to nfc and calls startNFC', async () => {
      const { result } = makeHook();
      await act(async () => {
        result.current.startNFC();
      });
      expect(result.current.phase).toBe('nfc');
      expect(result.current.status).toBe('Tap your Keycard');
      expect(mockStartNFC).toHaveBeenCalledWith('Tap your Keycard');
    });
  });

  describe('reset', () => {
    it('returns to idle and stops NFC', async () => {
      const { result } = makeHook();
      await act(async () => {
        result.current.startNFC();
      });
      await act(async () => {
        result.current.reset();
      });
      expect(result.current.phase).toBe('idle');
      expect(result.current.status).toBe('');
      expect(mockStopNFC).toHaveBeenCalled();
    });
  });

  describe('phase guard — card connected', () => {
    it('ignores card connected when phase is idle', async () => {
      const { result } = makeHook();
      expect(result.current.phase).toBe('idle');
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(mockOnCardConnected).not.toHaveBeenCalled();
      expect(result.current.phase).toBe('idle');
    });

    it('ignores card connected when phase is done', async () => {
      const { result } = makeHook();
      // Drive to done by going through nfc phase and completing
      mockOnCardConnected.mockResolvedValue(undefined);
      await act(async () => {
        result.current.startNFC();
      });
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(result.current.phase).toBe('done');

      mockOnCardConnected.mockClear();
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(mockOnCardConnected).not.toHaveBeenCalled();
    });

    it('retries card connected when phase is error', async () => {
      const { result } = makeHook();
      mockOnCardConnected.mockRejectedValueOnce(new Error('fail'));
      await act(async () => {
        result.current.startNFC();
      });
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(result.current.phase).toBe('error');

      // Re-tap: phase resets to nfc, operation is retried.
      mockOnCardConnected.mockResolvedValueOnce(undefined);
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(mockOnCardConnected).toHaveBeenCalledTimes(2);
      expect(result.current.phase).toBe('done');
    });

    it('ignores a second card connected event while an operation is in flight', async () => {
      const { result } = makeHook();
      let resolveFirst!: () => void;
      const firstOpPromise = new Promise<void>(resolve => {
        resolveFirst = resolve;
      });
      mockOnCardConnected.mockImplementationOnce(() => firstOpPromise);
      await act(async () => {
        result.current.startNFC();
      });
      // Fire first connection — onCardConnected is now in flight (pending)
      // Fire second connection immediately after; it should be ignored
      await act(async () => {
        capturedOnConnected?.(); // intentionally not awaited — starts the in-flight op
        await capturedOnConnected?.(); // second tap: should be blocked by inFlightRef
      });
      expect(mockOnCardConnected).toHaveBeenCalledTimes(1);
      // Resolve the first operation and confirm it completes normally
      await act(async () => {
        resolveFirst();
      });
      expect(result.current.phase).toBe('done');
    });

    it('handles card connected when phase is nfc', async () => {
      const { result } = makeHook();
      await act(async () => {
        result.current.startNFC();
      });
      expect(result.current.phase).toBe('nfc');
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(mockOnCardConnected).toHaveBeenCalledTimes(1);
      expect(result.current.phase).toBe('done');
    });

    it('sets error phase when onCardConnected throws', async () => {
      const { result } = makeHook();
      mockOnCardConnected.mockRejectedValue(new Error('bad mac'));
      await act(async () => {
        result.current.startNFC();
      });
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(result.current.phase).toBe('error');
      expect(result.current.status).toBe('bad mac');
    });
  });

  describe('NFC events', () => {
    it('user-cancelled resets to idle when in nfc phase', async () => {
      const { result } = makeHook();
      await act(async () => {
        result.current.startNFC();
      });
      await act(async () => {
        capturedOnCancelled?.();
      });
      expect(result.current.phase).toBe('idle');
    });

    it('user-cancelled does not change phase when idle', async () => {
      const { result } = makeHook();
      await act(async () => {
        capturedOnCancelled?.();
      });
      expect(result.current.phase).toBe('idle');
    });

    it('timeout updates status message', async () => {
      const { result } = makeHook();
      await act(async () => {
        capturedOnTimeout?.();
      });
      expect(result.current.status).toBe('Timed out — tap again');
    });

    it('card disconnected during nfc updates status and stays in nfc', async () => {
      const { result } = makeHook();
      await act(async () => {
        result.current.startNFC();
      });
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(result.current.phase).toBe('nfc');
      expect(result.current.status).toBe(
        'Connection lost - adjust Keycard position',
      );
    });

    it('mid-operation disconnect stays in nfc and does not show error', async () => {
      const { result } = makeHook();
      // Simulate: disconnect fires before the error reaches the catch
      mockOnCardConnected.mockImplementation(async () => {
        capturedOnDisconnected?.();
        throw new Error('CardIO Error: Error sending command');
      });
      await act(async () => {
        result.current.startNFC();
      });
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(result.current.phase).toBe('nfc');
      expect(result.current.status).toBe(
        'Connection lost - adjust Keycard position',
      );
    });

    it('real card error followed by disconnect stays in error', async () => {
      const { result } = makeHook();
      mockOnCardConnected.mockRejectedValue(new Error('Card is locked'));
      await act(async () => {
        result.current.startNFC();
      });
      await act(async () => {
        await capturedOnConnected?.();
      });
      expect(result.current.phase).toBe('error');
      expect(result.current.status).toBe('Card is locked');

      // Android NFC always fires disconnect after an operation — must not override the error
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(result.current.phase).toBe('error');
      expect(result.current.status).toBe('Card is locked');
    });

    it('card disconnected outside nfc does not change status', async () => {
      const { result } = makeHook();
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(result.current.phase).toBe('idle');
      expect(result.current.status).toBe('');
    });
  });
});
