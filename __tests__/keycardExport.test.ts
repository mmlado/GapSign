import { keccak_256 } from '@noble/hashes/sha3.js';

import {
  buildExportUr,
  exportKeyForWallet,
  prepareSignHash,
} from '../src/utils/keycardExport';

jest.mock('keycard-sdk', () => ({
  __esModule: true,
  default: {
    BIP32KeyPair: {
      fromTLV: jest.fn(() => ({ publicKey: new Uint8Array([9, 9, 9]) })),
    },
  },
}));

jest.mock('../src/utils/cryptoHdKey', () => ({
  buildCryptoHdKeyUR: jest.fn(() => 'ur:crypto-hdkey/mock'),
}));
jest.mock('../src/utils/cryptoAccount', () => ({
  buildCryptoAccountUR: jest.fn(() => 'ur:crypto-account/mock'),
  pubKeyFingerprint: jest.fn(() => 0xdeadbeef),
}));
jest.mock('../src/utils/cryptoMultiAccounts', () => ({
  buildCryptoMultiAccountsUR: jest.fn(() => 'ur:crypto-multi-accounts/mock'),
  exportKeysForBitget: jest.fn(),
}));

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

describe('prepareSignHash', () => {
  const message = 'hello world';
  const messageHex = Buffer.from(message, 'utf8').toString('hex');

  it('dataType=1 returns keccak256 of raw bytes', () => {
    const raw = Buffer.from(messageHex, 'hex');
    const expected = hex(keccak_256(raw));
    expect(hex(prepareSignHash(messageHex, 1))).toBe(expected);
  });

  it('dataType=4 returns keccak256 of raw bytes', () => {
    const raw = Buffer.from(messageHex, 'hex');
    const expected = hex(keccak_256(raw));
    expect(hex(prepareSignHash(messageHex, 4))).toBe(expected);
  });

  it('dataType=3 returns EIP-191 personal_sign hash', () => {
    const raw = Buffer.from(message, 'utf8');
    const prefix = `\x19Ethereum Signed Message:\n${raw.length}`;
    const prefixBytes = new TextEncoder().encode(prefix);
    const combined = new Uint8Array(prefixBytes.length + raw.length);
    combined.set(prefixBytes);
    combined.set(raw, prefixBytes.length);
    const expected = hex(keccak_256(combined));
    expect(hex(prepareSignHash(messageHex, 3))).toBe(expected);
  });

  it('dataType=3 produces a 32-byte hash regardless of message length', () => {
    const long = 'x'.repeat(200);
    const longHex = Buffer.from(long, 'utf8').toString('hex');
    const result = prepareSignHash(longHex, 3);
    expect(result).toHaveLength(32);
  });

  it('dataType=2 returns raw bytes unchanged', () => {
    const hash32Hex = 'ab'.repeat(32);
    const result = prepareSignHash(hash32Hex, 2);
    expect(hex(result)).toBe(hash32Hex);
  });

  it('undefined dataType returns raw bytes unchanged', () => {
    const hash32Hex = 'cd'.repeat(32);
    const result = prepareSignHash(hash32Hex, undefined);
    expect(hex(result)).toBe(hash32Hex);
  });
});

describe('buildExportUr', () => {
  const { buildCryptoHdKeyUR } = require('../src/utils/cryptoHdKey');
  const { buildCryptoAccountUR } = require('../src/utils/cryptoAccount');
  const {
    buildCryptoMultiAccountsUR,
  } = require('../src/utils/cryptoMultiAccounts');

  beforeEach(() => {
    jest.clearAllMocks();
    buildCryptoHdKeyUR.mockReturnValue('ur:crypto-hdkey/mock');
    buildCryptoAccountUR.mockReturnValue('ur:crypto-account/mock');
    buildCryptoMultiAccountsUR.mockReturnValue('ur:crypto-multi-accounts/mock');
  });

  it('calls buildCryptoHdKeyUR when result has exportRespData', () => {
    const result = buildExportUr(
      {
        exportRespData: new Uint8Array([1, 2, 3]),
        sourceFingerprint: 0xdeadbeef,
      },
      "m/44'/60'/0'",
      'MetaMask',
    );
    expect(buildCryptoHdKeyUR).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      "m/44'/60'/0'",
      0xdeadbeef,
      'MetaMask',
    );
    expect(result).toBe('ur:crypto-hdkey/mock');
  });

  it('calls buildCryptoMultiAccountsUR when result has keys', () => {
    const multiResult = { keys: [] } as any;
    const result = buildExportUr(multiResult, 'bitget');
    expect(buildCryptoMultiAccountsUR).toHaveBeenCalledWith(multiResult);
    expect(result).toBe('ur:crypto-multi-accounts/mock');
  });

  it('calls buildCryptoAccountUR for Bitcoin crypto-account result', () => {
    const btcResult = { masterFingerprint: 0xdeadbeef, descriptors: [] } as any;
    const result = buildExportUr(btcResult, "m/84'/0'/0'");
    expect(buildCryptoAccountUR).toHaveBeenCalledWith(btcResult);
    expect(result).toBe('ur:crypto-account/mock');
  });
});

describe('exportKeyForWallet', () => {
  const { pubKeyFingerprint } = require('../src/utils/cryptoAccount');
  const { exportKeysForBitget } = require('../src/utils/cryptoMultiAccounts');

  const response = (data: number[]) => ({
    checkOK: jest.fn(),
    data: new Uint8Array(data),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    pubKeyFingerprint.mockReturnValue(0xdeadbeef);
  });

  it('delegates Bitget exports to exportKeysForBitget', async () => {
    const bitgetResult = { keys: [{ path: "m/44'/60'/0'/0/0" }] };
    exportKeysForBitget.mockResolvedValue(bitgetResult);
    const cmdSet = {} as any;
    const setStatus = jest.fn();

    await expect(exportKeyForWallet(cmdSet, 'bitget', setStatus)).resolves.toBe(
      bitgetResult,
    );
    expect(exportKeysForBitget).toHaveBeenCalledWith(cmdSet, setStatus);
  });

  it('exports an Ethereum hdkey with the parent fingerprint', async () => {
    const parentResp = response([1, 2, 3]);
    const extendedResp = response([4, 5, 6]);
    const cmdSet = {
      exportKey: jest.fn().mockResolvedValue(parentResp),
      exportExtendedKey: jest.fn().mockResolvedValue(extendedResp),
    } as any;

    const result = await exportKeyForWallet(cmdSet, "m/44'/60'/0'/0/0");

    expect(cmdSet.exportKey).toHaveBeenCalledWith(
      0,
      true,
      "m/44'/60'/0'/0",
      false,
    );
    expect(cmdSet.exportExtendedKey).toHaveBeenCalledWith(
      0,
      "m/44'/60'/0'/0/0",
      false,
    );
    expect(parentResp.checkOK).toHaveBeenCalled();
    expect(extendedResp.checkOK).toHaveBeenCalled();
    expect(result).toEqual({
      exportRespData: new Uint8Array([4, 5, 6]),
      sourceFingerprint: 0xdeadbeef,
    });
  });

  it('builds Bitcoin descriptor exports for single-sig paths', async () => {
    const cmdSet = {
      exportKey: jest
        .fn()
        .mockResolvedValueOnce(response([0]))
        .mockResolvedValueOnce(response([1]))
        .mockResolvedValueOnce(response([2]))
        .mockResolvedValueOnce(response([3])),
      exportExtendedKey: jest
        .fn()
        .mockResolvedValueOnce(response([10]))
        .mockResolvedValueOnce(response([20]))
        .mockResolvedValueOnce(response([30])),
    } as any;

    const result = await exportKeyForWallet(cmdSet, "m/84'/0'/0'");

    expect(result).toMatchObject({
      masterFingerprint: 0xdeadbeef,
      descriptors: [
        { derivationPath: "m/84'/0'/0'", scriptType: 'wpkh' },
        { derivationPath: "m/49'/0'/0'", scriptType: 'sh-wpkh' },
        { derivationPath: "m/44'/0'/0'", scriptType: 'pkh' },
      ],
    });
    expect(cmdSet.exportExtendedKey).toHaveBeenCalledTimes(3);
  });

  it('builds Bitcoin descriptor exports for multisig paths', async () => {
    const cmdSet = {
      exportKey: jest
        .fn()
        .mockResolvedValueOnce(response([0]))
        .mockResolvedValueOnce(response([1]))
        .mockResolvedValueOnce(response([2]))
        .mockResolvedValueOnce(response([3])),
      exportExtendedKey: jest
        .fn()
        .mockResolvedValueOnce(response([10]))
        .mockResolvedValueOnce(response([20]))
        .mockResolvedValueOnce(response([30])),
    } as any;

    const result = await exportKeyForWallet(cmdSet, "m/48'/0'/0'/2'");

    expect(result).toMatchObject({
      descriptors: [
        { derivationPath: "m/48'/0'/0'/2'", scriptType: 'wsh' },
        { derivationPath: "m/48'/0'/0'/1'", scriptType: 'sh-wsh' },
        { derivationPath: "m/45'", scriptType: 'sh' },
      ],
    });
  });
});
