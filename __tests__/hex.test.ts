import { ensureHexPrefix, toHex } from '../src/utils/hex';

describe('ensureHexPrefix', () => {
  it('adds 0x prefix when missing', () => {
    expect(ensureHexPrefix('deadbeef')).toBe('0xdeadbeef');
  });

  it('keeps existing 0x prefix', () => {
    expect(ensureHexPrefix('0xdeadbeef')).toBe('0xdeadbeef');
  });
});

describe('toHex', () => {
  it('converts Uint8Array to lowercase hex string', () => {
    expect(toHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe('deadbeef');
  });

  it('pads single-byte values', () => {
    expect(toHex(new Uint8Array([0x01, 0x0a, 0xff]))).toBe('010aff');
  });

  it('handles empty array', () => {
    expect(toHex(new Uint8Array([]))).toBe('');
  });
});
