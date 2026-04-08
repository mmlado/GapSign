import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { useGenerateSlip39Shares } from '../src/hooks/keycard/useGenerateSlip39Shares';

type OperationFn = (cmdSet: any, helpers: any) => Promise<Uint8Array>;

let capturedOperation: OperationFn | null = null;
let capturedOptions: { requiresPin?: boolean } | null = null;

const mockExecute = jest.fn(
  (fn: OperationFn, opts: { requiresPin?: boolean }) => {
    capturedOperation = fn;
    capturedOptions = opts;
  },
);

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

let hookStart: () => void;

function TestHook({
  shareCount = 3,
  threshold = 2,
}: {
  shareCount?: number;
  threshold?: number;
}) {
  const { start } = useGenerateSlip39Shares(shareCount, threshold);
  hookStart = start;
  return null;
}

async function mountHook(shareCount?: number, threshold?: number) {
  await act(async () => {
    ReactTestRenderer.create(
      React.createElement(TestHook, { shareCount, threshold }),
    );
  });
}

describe('useGenerateSlip39Shares', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    capturedOperation = null;
    capturedOptions = null;
  });

  it('reads Keycard entropy without requiring PIN', async () => {
    await mountHook();
    await act(async () => {
      hookStart();
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(capturedOptions).toEqual({ requiresPin: false });

    const entropy = new Uint8Array([1, 2, 3]);
    const checkOK = jest.fn();
    const setStatus = jest.fn();
    const result = await capturedOperation!(
      {
        generateMnemonic: jest.fn().mockResolvedValue({
          data: entropy,
          checkOK,
        }),
      },
      { setStatus },
    );

    expect(setStatus).toHaveBeenCalledWith('Reading Keycard entropy...');
    expect(checkOK).toHaveBeenCalledTimes(1);
    expect(result).toBe(entropy);
  });

  it('validates generation settings before requesting NFC', async () => {
    await mountHook(3, 1);

    expect(() => hookStart()).toThrow(/at least 2/);
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
