import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { useVerifyFingerprint } from '../src/hooks/keycard/useVerifyFingerprint';

type OperationFn = (cmdSet: any) => Promise<any>;

let capturedOperation: OperationFn | null = null;
let capturedOptions: { requiresPin?: boolean } | null = null;

const mockExecute = jest.fn(
  (fn: OperationFn, opts: { requiresPin?: boolean }) => {
    capturedOperation = fn;
    capturedOptions = opts;
  },
);
const mockPubKeyFingerprint = jest.fn();
const mockFromTLV = jest.fn();

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

jest.mock('../src/utils/cryptoAccount', () => ({
  pubKeyFingerprint: (...args: any[]) => mockPubKeyFingerprint(...args),
}));

jest.mock('keycard-sdk', () => ({
  BIP32KeyPair: { fromTLV: (...args: any[]) => mockFromTLV(...args) },
}));

let hookStart: (expectedFingerprint: number) => void;
const expectedFingerprint = 0xdeadbeef;

function TestHook() {
  const { start } = useVerifyFingerprint();
  hookStart = start;
  return null;
}

async function mountHook() {
  await act(async () => {
    ReactTestRenderer.create(React.createElement(TestHook));
  });
}

describe('useVerifyFingerprint', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockPubKeyFingerprint.mockClear();
    mockFromTLV.mockClear();
    capturedOperation = null;
    capturedOptions = null;
  });

  it('calls execute with requiresPin: true', async () => {
    await mountHook();
    await act(async () => {
      hookStart(expectedFingerprint);
    });

    expect(capturedOptions).toEqual({ requiresPin: true });
  });

  it('returns match when fingerprints match', async () => {
    const cardPubKey = new Uint8Array([4, 9, 8]);
    mockFromTLV.mockReturnValue({ publicKey: cardPubKey });
    mockPubKeyFingerprint.mockReturnValueOnce(expectedFingerprint);
    const checkOK = jest.fn();
    const cmdSet = {
      exportKey: jest.fn().mockResolvedValue({ checkOK, data: cardPubKey }),
    };
    await mountHook();
    await act(async () => {
      hookStart(expectedFingerprint);
    });

    const result = await capturedOperation!(cmdSet);

    expect(result).toBe('match');
    expect(cmdSet.exportKey).toHaveBeenCalledWith(0, true, 'm', false);
    expect(checkOK).toHaveBeenCalledTimes(1);
  });

  it('returns mismatch when fingerprints differ', async () => {
    mockFromTLV.mockReturnValue({ publicKey: new Uint8Array([4, 9, 8]) });
    mockPubKeyFingerprint.mockReturnValueOnce(2);
    await mountHook();
    await act(async () => {
      hookStart(1);
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
