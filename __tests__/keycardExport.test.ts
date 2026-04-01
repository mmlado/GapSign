import { keccak_256 } from '@noble/hashes/sha3.js';

import { prepareSignHash } from '../src/utils/keycardExport';

jest.mock('keycard-sdk', () => ({ __esModule: true, default: {} }));

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
