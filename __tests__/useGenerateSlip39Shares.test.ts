import { act, renderHook } from '@testing-library/react-native';

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

describe('useGenerateSlip39Shares', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    capturedOperation = null;
    capturedOptions = null;
  });

  it('reads Keycard entropy without requiring PIN', async () => {
    const { result } = renderHook(() => useGenerateSlip39Shares(3, 2));
    await act(async () => {
      result.current.start();
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(capturedOptions).toEqual({ requiresPin: false });

    const entropy = new Uint8Array([1, 2, 3]);
    const checkOK = jest.fn();
    const setStatus = jest.fn();
    const opResult = await capturedOperation!(
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
    expect(opResult).toBe(entropy);
  });

  it('validates generation settings before requesting NFC', () => {
    const { result } = renderHook(() => useGenerateSlip39Shares(3, 1));

    expect(() => result.current.start()).toThrow(/at least 2/);
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
