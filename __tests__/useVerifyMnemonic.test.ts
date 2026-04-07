import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { useVerifyMnemonic } from '../src/hooks/keycard/useVerifyMnemonic';

// ---------------------------------------------------------------------------
// Mock useKeycardOperation
// ---------------------------------------------------------------------------

type OperationFn = (cmdSet: any) => Promise<any>;

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

// Mock Mnemonic and BIP32KeyPair
const mockToBinarySeed = jest.fn().mockReturnValue(Buffer.from('seed'));
const mockFromBinarySeed = jest
  .fn()
  .mockReturnValue({ publicKey: new Uint8Array([4, 1, 2]) });

jest.mock('keycard-sdk/dist/mnemonic', () => ({
  Mnemonic: { toBinarySeed: (...args: any[]) => mockToBinarySeed(...args) },
}));

jest.mock('keycard-sdk/dist/bip32key', () => ({
  BIP32KeyPair: {
    fromBinarySeed: (...args: any[]) => mockFromBinarySeed(...args),
  },
}));

// Mock pubKeyFingerprint and parsePublicKeyFromTLV
const mockPubKeyFingerprint = jest.fn();
const mockParsePublicKeyFromTLV = jest.fn();

jest.mock('../src/utils/cryptoAccount', () => ({
  pubKeyFingerprint: (...args: any[]) => mockPubKeyFingerprint(...args),
}));

jest.mock('../src/utils/keycardExport', () => ({
  parsePublicKeyFromTLV: (...args: any[]) => mockParsePublicKeyFromTLV(...args),
}));

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

const WORDS = Array(12).fill('word');

let hookStart: () => void;

function TestHook({ passphrase }: { passphrase?: string } = {}) {
  const { start } = useVerifyMnemonic(WORDS, passphrase);
  hookStart = start;
  return null;
}

async function mountHook(passphrase?: string) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      React.createElement(TestHook, { passphrase }),
    );
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useVerifyMnemonic', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockToBinarySeed.mockClear();
    mockFromBinarySeed.mockClear();
    mockPubKeyFingerprint.mockClear();
    mockParsePublicKeyFromTLV.mockClear();
    capturedOperation = null;
    capturedOptions = null;
  });

  it('calls execute with requiresPin: true', async () => {
    await mountHook();
    await act(async () => {
      hookStart();
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(capturedOptions).toEqual({ requiresPin: true });
  });

  describe('operation callback', () => {
    async function runOperation(cmdSet: any) {
      await mountHook();
      await act(async () => {
        hookStart();
      });
      return capturedOperation!(cmdSet);
    }

    it('returns "match" when fingerprints match', async () => {
      const cardPubKey = new Uint8Array([4, 9, 8]);
      mockParsePublicKeyFromTLV.mockReturnValue(cardPubKey);
      mockPubKeyFingerprint
        .mockReturnValueOnce(0xdeadbeef) // mnemonic fingerprint
        .mockReturnValueOnce(0xdeadbeef); // card fingerprint

      const mockCheckOK = jest.fn();
      const cmdSet = {
        exportKey: jest
          .fn()
          .mockResolvedValue({ checkOK: mockCheckOK, data: cardPubKey }),
      };

      const result = await runOperation(cmdSet);

      expect(result).toBe('match');
      expect(cmdSet.exportKey).toHaveBeenCalledWith(0, true, 'm', false);
      expect(mockCheckOK).toHaveBeenCalled();
    });

    it('returns "mismatch" when fingerprints differ', async () => {
      const cardPubKey = new Uint8Array([4, 9, 8]);
      mockParsePublicKeyFromTLV.mockReturnValue(cardPubKey);
      mockPubKeyFingerprint
        .mockReturnValueOnce(0x11111111) // mnemonic fingerprint
        .mockReturnValueOnce(0x22222222); // card fingerprint

      const cmdSet = {
        exportKey: jest.fn().mockResolvedValue({
          checkOK: jest.fn(),
          data: cardPubKey,
        }),
      };

      const result = await runOperation(cmdSet);
      expect(result).toBe('mismatch');
    });

    it('passes passphrase to toBinarySeed', async () => {
      mockParsePublicKeyFromTLV.mockReturnValue(new Uint8Array([4]));
      mockPubKeyFingerprint.mockReturnValue(0);

      const cmdSet = {
        exportKey: jest.fn().mockResolvedValue({
          checkOK: jest.fn(),
          data: new Uint8Array([4]),
        }),
      };

      await mountHook('secret');
      await act(async () => {
        hookStart();
      });
      await capturedOperation!(cmdSet);

      expect(mockToBinarySeed).toHaveBeenCalledWith(WORDS.join(' '), 'secret');
    });

    it('uses empty string passphrase when none provided', async () => {
      mockParsePublicKeyFromTLV.mockReturnValue(new Uint8Array([4]));
      mockPubKeyFingerprint.mockReturnValue(0);

      const cmdSet = {
        exportKey: jest.fn().mockResolvedValue({
          checkOK: jest.fn(),
          data: new Uint8Array([4]),
        }),
      };

      await runOperation(cmdSet);
      expect(mockToBinarySeed).toHaveBeenCalledWith(WORDS.join(' '), '');
    });
  });
});
