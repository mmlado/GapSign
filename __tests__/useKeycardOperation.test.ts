import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useKeycardOperation } from '../src/hooks/keycard/useKeycardOperation';
import type { UseKeycardOperation } from '../src/hooks/keycard/useKeycardOperation';
import { checkGenuine } from '../src/utils/genuineCheck';
import { loadPairing } from '../src/storage/pairingStorage';

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
    Commandset: jest.fn(),
    Certificate: { verifyIdentity: jest.fn() },
  },
}));

jest.mock('../src/utils/genuineCheck', () => ({
  checkGenuine: jest.fn(),
}));

jest.mock('../src/storage/pairingStorage', () => ({
  loadPairing: jest.fn(),
  savePairing: jest.fn(),
}));

const mockCheckGenuine = checkGenuine as jest.MockedFunction<
  typeof checkGenuine
>;
const mockLoadPairing = loadPairing as jest.MockedFunction<typeof loadPairing>;

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
    mockCheckGenuine.mockClear();
    mockLoadPairing.mockClear();
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
        latestHook.execute(jest.fn(), { requiresPin: true });
      });
      expect(latestHook.phase).toBe('pin_entry');
    });

    it('transitions to nfc and calls startNFC when requiresPin is false', async () => {
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), { requiresPin: false });
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
        latestHook.execute(jest.fn(), { requiresPin: true });
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
        latestHook.execute(jest.fn(), { requiresPin: false });
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
        latestHook.execute(jest.fn(), { requiresPin: true });
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
        latestHook.execute(jest.fn(), { requiresPin: false });
      });
      await act(async () => {
        capturedOnDisconnected?.();
      });
      expect(latestHook.phase).toBe('nfc');
      expect(latestHook.status).toBe(
        'Connection lost - adjust Keycard position',
      );
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

  // -------------------------------------------------------------------------
  // Genuine check
  // -------------------------------------------------------------------------

  describe('genuine check', () => {
    // A minimal Commandset whose select() returns 0x9000 so useNFCSession
    // proceeds to call our handleCardConnected.
    const makeMockCmdSet = () => ({
      applicationInfo: {
        instanceUID: new Uint8Array([0xaa, 0xbb]),
        initializedCard: true,
        freePairingSlots: 5,
        hasMasterKey: () => false,
      },
      select: jest.fn().mockResolvedValue({ sw: 0x9000 }),
      identifyCard: jest.fn(),
      autoPair: jest.fn().mockResolvedValue(undefined),
      getPairing: jest.fn().mockReturnValue({ pairingIndex: 0 }),
      setPairing: jest.fn(),
      autoOpenSecureChannel: jest.fn().mockResolvedValue(undefined),
      verifyPIN: jest.fn().mockResolvedValue({
        sw: 0x9000,
        checkAuthOK: jest.fn(),
      }),
    });

    beforeEach(() => {
      // Default: no existing pairing, genuine check passes
      mockLoadPairing.mockResolvedValue(null);
      mockCheckGenuine.mockResolvedValue(true);

      // Make Keycard.Commandset return a fresh mock for each test
      const Keycard = require('keycard-sdk').default;
      Keycard.Commandset.mockImplementation(() => makeMockCmdSet());
    });

    async function triggerCardConnect() {
      await act(async () => {
        await capturedOnConnected?.();
      });
    }

    it('genuine check runs when no existing pairing', async () => {
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn().mockResolvedValue('result'), {
          requiresPin: false,
        });
      });
      await triggerCardConnect();
      expect(mockCheckGenuine).toHaveBeenCalledTimes(1);
    });

    it('phase becomes genuine_warning when check fails', async () => {
      mockCheckGenuine.mockResolvedValue(false);
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), { requiresPin: false });
      });
      await triggerCardConnect();
      expect(latestHook.phase).toBe('genuine_warning');
    });

    it('genuine check is skipped when pairing already exists', async () => {
      mockLoadPairing.mockResolvedValue({ pairingIndex: 0 } as any);
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn().mockResolvedValue('result'), {
          requiresPin: false,
        });
      });
      await triggerCardConnect();
      expect(mockCheckGenuine).not.toHaveBeenCalled();
    });

    it('proceedWithNonGenuine transitions back to nfc', async () => {
      mockCheckGenuine.mockResolvedValue(false);
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), { requiresPin: false });
      });
      await triggerCardConnect();
      expect(latestHook.phase).toBe('genuine_warning');

      await act(async () => {
        latestHook.proceedWithNonGenuine();
      });
      expect(latestHook.phase).toBe('nfc');
      expect(mockStartNFC).toHaveBeenCalledTimes(2); // initial + after proceed
    });

    it('reconnect after proceedWithNonGenuine skips genuine check', async () => {
      mockCheckGenuine.mockResolvedValue(false);
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn().mockResolvedValue('r'), {
          requiresPin: false,
        });
      });
      await triggerCardConnect(); // first connect: check fails, warning shown
      await act(async () => {
        latestHook.proceedWithNonGenuine();
      });
      // Simulate second card connect after user proceeds
      mockCheckGenuine.mockClear();
      await triggerCardConnect();
      expect(mockCheckGenuine).not.toHaveBeenCalled();
    });

    it('cancel in genuine_warning returns to idle', async () => {
      mockCheckGenuine.mockResolvedValue(false);
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), { requiresPin: false });
      });
      await triggerCardConnect();
      expect(latestHook.phase).toBe('genuine_warning');

      await act(async () => {
        latestHook.cancel();
      });
      expect(latestHook.phase).toBe('idle');
    });

    it('reset in genuine_warning returns to idle and clears result', async () => {
      mockCheckGenuine.mockResolvedValue(false);
      await mountHook();
      await act(async () => {
        latestHook.execute(jest.fn(), { requiresPin: false });
      });
      await triggerCardConnect();
      expect(latestHook.phase).toBe('genuine_warning');

      await act(async () => {
        latestHook.reset();
      });
      expect(latestHook.phase).toBe('idle');
      expect(latestHook.result).toBeNull();
    });
  });
});
