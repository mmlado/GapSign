import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useLoadKey } from '../src/hooks/keycard/useLoadKey';

// ---------------------------------------------------------------------------
// Mock useKeycardOperation — captures the operation callback for direct testing
// ---------------------------------------------------------------------------

type OperationFn = (cmdSet: any) => Promise<void>;

let capturedOperation: OperationFn | null = null;
let capturedOptions: { requiresPin?: boolean } | null = null;

const mockExecute = jest.fn(
  (fn: OperationFn, opts: { requiresPin?: boolean }) => {
    capturedOperation = fn;
    capturedOptions = opts;
  },
);
const mockCancel = jest.fn();
const mockReset = jest.fn();
const mockSubmitPin = jest.fn();

jest.mock('../src/hooks/keycard/useKeycardOperation', () => ({
  useKeycardOperation: () => ({
    phase: 'idle',
    status: '',
    result: null,
    execute: mockExecute,
    cancel: mockCancel,
    reset: mockReset,
    submitPin: mockSubmitPin,
  }),
}));

// Mock keycard-sdk/dist/mnemonic and bip32key
const mockToBinarySeed = jest.fn().mockReturnValue(Buffer.from('seed'));
const mockFromBinarySeed = jest.fn().mockReturnValue({ type: 'keypair' });

jest.mock('keycard-sdk/dist/mnemonic', () => ({
  Mnemonic: { toBinarySeed: (...args: any[]) => mockToBinarySeed(...args) },
}));

jest.mock('keycard-sdk/dist/bip32key', () => ({
  BIP32KeyPair: {
    fromBinarySeed: (...args: any[]) => mockFromBinarySeed(...args),
  },
}));

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

const WORDS = [
  'word1',
  'word2',
  'word3',
  'word4',
  'word5',
  'word6',
  'word7',
  'word8',
  'word9',
  'word10',
  'word11',
  'word12',
];

let hookStart: () => void;

function TestHook() {
  const { start } = useLoadKey(WORDS);
  hookStart = start;
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

describe('useLoadKey', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockToBinarySeed.mockClear();
    mockFromBinarySeed.mockClear();
    capturedOperation = null;
    capturedOptions = null;
  });

  describe('start', () => {
    it('calls execute with requiresPin: true', async () => {
      await mountHook();
      await act(async () => {
        hookStart();
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(capturedOptions).toEqual({ requiresPin: true });
    });
  });

  describe('operation callback', () => {
    async function runOperation(cmdSet: any) {
      await mountHook();
      await act(async () => {
        hookStart();
      });
      await capturedOperation!(cmdSet);
    }

    it('derives seed from words and loads keypair onto card', async () => {
      const mockCheckOK = jest.fn();
      const mockLoadBIP32KeyPair = jest
        .fn()
        .mockResolvedValue({ checkOK: mockCheckOK });
      const cmdSet = {
        applicationInfo: { hasMasterKey: () => false },
        loadBIP32KeyPair: mockLoadBIP32KeyPair,
      };

      await runOperation(cmdSet);

      expect(mockToBinarySeed).toHaveBeenCalledWith(WORDS.join(' '));
      expect(mockFromBinarySeed).toHaveBeenCalledWith(Buffer.from('seed'));
      expect(mockLoadBIP32KeyPair).toHaveBeenCalledWith({ type: 'keypair' });
      expect(mockCheckOK).toHaveBeenCalled();
    });

    it('throws if card already has a master key', async () => {
      const cmdSet = {
        applicationInfo: { hasMasterKey: () => true },
        loadBIP32KeyPair: jest.fn(),
      };

      await mountHook();
      await act(async () => {
        hookStart();
      });

      await expect(capturedOperation!(cmdSet)).rejects.toThrow(
        'Card already has a key. Factory reset required.',
      );
      expect(cmdSet.loadBIP32KeyPair).not.toHaveBeenCalled();
    });

    it('handles missing applicationInfo without throwing', async () => {
      const mockCheckOK = jest.fn();
      const mockLoadBIP32KeyPair = jest
        .fn()
        .mockResolvedValue({ checkOK: mockCheckOK });
      const cmdSet = {
        applicationInfo: null,
        loadBIP32KeyPair: mockLoadBIP32KeyPair,
      };

      await runOperation(cmdSet);

      expect(mockLoadBIP32KeyPair).toHaveBeenCalled();
      expect(mockCheckOK).toHaveBeenCalled();
    });

    it('propagates error when loadBIP32KeyPair fails', async () => {
      const cmdSet = {
        applicationInfo: { hasMasterKey: () => false },
        loadBIP32KeyPair: jest.fn().mockResolvedValue({
          checkOK: jest.fn().mockImplementation(() => {
            throw new Error('LOAD_KEY failed: 0x6982');
          }),
        }),
      };

      await mountHook();
      await act(async () => {
        hookStart();
      });

      await expect(capturedOperation!(cmdSet)).rejects.toThrow(
        'LOAD_KEY failed: 0x6982',
      );
    });
  });
});
