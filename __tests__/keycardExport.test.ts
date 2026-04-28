import { keccak_256 } from '@noble/hashes/sha3.js';

import { buildExportUr, prepareSignHash } from '../src/utils/keycardExport';

jest.mock('keycard-sdk', () => ({ __esModule: true, default: {} }));

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
