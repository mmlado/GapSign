import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { useLoadSlip39 } from '../src/hooks/keycard/useLoadSlip39';

type OperationFn = (cmdSet: any) => Promise<void>;

let capturedOperation: OperationFn | null = null;
let capturedOptions: { requiresPin?: boolean } | null = null;

const mockExecute = jest.fn(
  (fn: OperationFn, opts: { requiresPin?: boolean }) => {
    capturedOperation = fn;
    capturedOptions = opts;
  },
);
const mockRecoverSlip39Secret = jest.fn(() => new Uint8Array(16).fill(1));
const mockSlip39SecretToKeyPair = jest.fn(() => ({ type: 'keypair' }));

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

let hookStart: () => void;

function TestHook() {
  const { start } = useLoadSlip39(['share one', 'share two'], 'secret');
  hookStart = start;
  return null;
}

async function mountHook() {
  await act(async () => {
    ReactTestRenderer.create(React.createElement(TestHook));
  });
}

describe('useLoadSlip39', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockRecoverSlip39Secret.mockClear();
    mockSlip39SecretToKeyPair.mockClear();
    capturedOperation = null;
    capturedOptions = null;
  });

  it('requests PIN before doing SLIP39 recovery work', async () => {
    await mountHook();
    await act(async () => {
      hookStart();
    });

    expect(mockRecoverSlip39Secret).not.toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(capturedOptions).toEqual({ requiresPin: true });
  });

  it('loads the derived BIP32 keypair onto an empty card', async () => {
    await mountHook();
    await act(async () => {
      hookStart();
    });
    const checkOK = jest.fn();
    const cmdSet = {
      applicationInfo: { hasMasterKey: () => false },
      loadBIP32KeyPair: jest.fn().mockResolvedValue({ checkOK }),
    };

    await capturedOperation!(cmdSet);

    expect(mockRecoverSlip39Secret).toHaveBeenCalledWith(
      ['share one', 'share two'],
      'secret',
    );
    expect(mockSlip39SecretToKeyPair).toHaveBeenCalled();
    expect(cmdSet.loadBIP32KeyPair).toHaveBeenCalledWith({ type: 'keypair' });
    expect(checkOK).toHaveBeenCalledTimes(1);
  });

  it('rejects cards that already have a master key', async () => {
    await mountHook();
    await act(async () => {
      hookStart();
    });

    await expect(
      capturedOperation!({
        applicationInfo: { hasMasterKey: () => true },
        loadBIP32KeyPair: jest.fn(),
      }),
    ).rejects.toThrow(/already has a key/);
  });
});
