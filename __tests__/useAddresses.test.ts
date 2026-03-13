import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useAddresses } from '../src/hooks/keycard/useAddresses';

// ---------------------------------------------------------------------------
// Mock useKeycardOperation — captures the operation callback for direct testing
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

// ---------------------------------------------------------------------------
// Mock parseExtendedKeyFromTLV
// ---------------------------------------------------------------------------

const mockHDKey = {
  publicKey: new Uint8Array(33),
  chainCode: new Uint8Array(32),
};
const mockParseExtendedKeyFromTLV = jest.fn().mockReturnValue(mockHDKey);

jest.mock('../src/utils/hdAddress', () => ({
  parseExtendedKeyFromTLV: (...args: any[]) =>
    mockParseExtendedKeyFromTLV(...args),
  deriveAddresses: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

let hookStart: () => void;

function TestHook({ coin }: { coin: 'eth' | 'btc' }) {
  const { start } = useAddresses(coin);
  hookStart = start;
  return null;
}

async function mountHook(coin: 'eth' | 'btc' = 'eth') {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      React.createElement(TestHook, { coin }),
    );
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAddresses', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockParseExtendedKeyFromTLV.mockClear();
    capturedOperation = null;
    capturedOptions = null;
  });

  describe('start()', () => {
    it('calls execute with requiresPin: true', async () => {
      await mountHook('eth');
      await act(async () => {
        hookStart();
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(capturedOptions).toEqual({ requiresPin: true });
    });
  });

  describe('ETH operation', () => {
    async function runEthOperation(cmdSet: any) {
      await mountHook('eth');
      await act(async () => {
        hookStart();
      });
      return capturedOperation!(cmdSet);
    }

    it("calls exportExtendedKey with the ETH path m/44'/60'/0'", async () => {
      const mockCheckOK = jest.fn();
      const mockExport = jest.fn().mockResolvedValue({
        checkOK: mockCheckOK,
        data: new Uint8Array(10),
      });
      await runEthOperation({ exportExtendedKey: mockExport });
      expect(mockExport).toHaveBeenCalledWith(0, "m/44'/60'/0'", false);
    });

    it('calls resp.checkOK()', async () => {
      const mockCheckOK = jest.fn();
      await runEthOperation({
        exportExtendedKey: jest
          .fn()
          .mockResolvedValue({
            checkOK: mockCheckOK,
            data: new Uint8Array(10),
          }),
      });
      expect(mockCheckOK).toHaveBeenCalled();
    });

    it('calls parseExtendedKeyFromTLV with the response data', async () => {
      const data = new Uint8Array([1, 2, 3]);
      await runEthOperation({
        exportExtendedKey: jest
          .fn()
          .mockResolvedValue({ checkOK: jest.fn(), data }),
      });
      expect(mockParseExtendedKeyFromTLV).toHaveBeenCalledWith(data);
    });

    it('returns the HDKey from parseExtendedKeyFromTLV', async () => {
      const result = await runEthOperation({
        exportExtendedKey: jest.fn().mockResolvedValue({
          checkOK: jest.fn(),
          data: new Uint8Array(10),
        }),
      });
      expect(result).toBe(mockHDKey);
    });
  });

  describe('BTC operation', () => {
    it("calls exportExtendedKey with the BTC path m/84'/0'/0'", async () => {
      await mountHook('btc');
      await act(async () => {
        hookStart();
      });
      const mockExport = jest.fn().mockResolvedValue({
        checkOK: jest.fn(),
        data: new Uint8Array(10),
      });
      await capturedOperation!({ exportExtendedKey: mockExport });
      expect(mockExport).toHaveBeenCalledWith(0, "m/84'/0'/0'", false);
    });
  });
});
