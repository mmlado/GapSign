import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { useVerifySlip39 } from '../src/hooks/keycard/useVerifySlip39';

type OperationFn = (cmdSet: any) => Promise<any>;

let capturedOperation: OperationFn | null = null;
let capturedOptions: { requiresPin?: boolean } | null = null;

const mockExecute = jest.fn(
  (fn: OperationFn, opts: { requiresPin?: boolean }) => {
    capturedOperation = fn;
    capturedOptions = opts;
  },
);
const mockRecoverSlip39Secret = jest.fn(() => new Uint8Array(16).fill(1));
const mockSlip39SecretToKeyPair = jest.fn(() => ({
  publicKey: new Uint8Array([4, 1, 2]),
}));
const mockPubKeyFingerprint = jest.fn();
const mockParsePublicKeyFromTLV = jest.fn();

jest.mock('../src/hooks/keycard/useKeycardOperation', () => ({
  useKeycardOperation: () => ({
    phase: 'idle',
    status: '',
    result: null,
    execute: mockExecute,
    cancel: jest.fn(),
    reset: jest.fn(),
    submitPin: jest.fn(),
  }),
}));

jest.mock('../src/utils/slip39', () => ({
  recoverSlip39Secret: (...args: any[]) => mockRecoverSlip39Secret(...args),
  slip39SecretToKeyPair: (...args: any[]) => mockSlip39SecretToKeyPair(...args),
}));

jest.mock('../src/utils/cryptoAccount', () => ({
  pubKeyFingerprint: (...args: any[]) => mockPubKeyFingerprint(...args),
}));

jest.mock('../src/utils/keycardExport', () => ({
  parsePublicKeyFromTLV: (...args: any[]) => mockParsePublicKeyFromTLV(...args),
}));

let hookStart: () => void;

function TestHook() {
  const { start } = useVerifySlip39(['share one', 'share two'], 'secret');
  hookStart = start;
  return null;
}

async function mountHook() {
  await act(async () => {
    ReactTestRenderer.create(React.createElement(TestHook));
  });
}

describe('useVerifySlip39', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockRecoverSlip39Secret.mockClear();
    mockSlip39SecretToKeyPair.mockClear();
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

    expect(mockRecoverSlip39Secret).not.toHaveBeenCalled();
    expect(capturedOptions).toEqual({ requiresPin: true });
  });

  it('returns match when fingerprints match', async () => {
    const cardPubKey = new Uint8Array([4, 9, 8]);
    mockParsePublicKeyFromTLV.mockReturnValue(cardPubKey);
    mockPubKeyFingerprint
      .mockReturnValueOnce(0xdeadbeef)
      .mockReturnValueOnce(0xdeadbeef);
    const checkOK = jest.fn();
    const cmdSet = {
      exportKey: jest.fn().mockResolvedValue({ checkOK, data: cardPubKey }),
    };
    await mountHook();
    await act(async () => {
      hookStart();
    });

    const result = await capturedOperation!(cmdSet);

    expect(mockRecoverSlip39Secret).toHaveBeenCalledWith(
      ['share one', 'share two'],
      'secret',
    );
    expect(result).toBe('match');
    expect(cmdSet.exportKey).toHaveBeenCalledWith(0, true, 'm', false);
    expect(checkOK).toHaveBeenCalledTimes(1);
  });

  it('returns mismatch when fingerprints differ', async () => {
    mockParsePublicKeyFromTLV.mockReturnValue(new Uint8Array([4, 9, 8]));
    mockPubKeyFingerprint.mockReturnValueOnce(1).mockReturnValueOnce(2);
    await mountHook();
    await act(async () => {
      hookStart();
    });

    const result = await capturedOperation!({
      exportKey: jest.fn().mockResolvedValue({
        checkOK: jest.fn(),
        data: new Uint8Array([4, 9, 8]),
      }),
    });

    expect(result).toBe('mismatch');
  });
});
