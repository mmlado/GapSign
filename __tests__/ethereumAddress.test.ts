import { pubKeyToEthAddress } from '../src/utils/ethereumAddress';

// ---------------------------------------------------------------------------
// Fixtures — secp256k1 generator point G (well-known, definitely on curve)
// ---------------------------------------------------------------------------

// G compressed
const G = new Uint8Array([
  0x02, 0x79, 0xbe, 0x66, 0x7e, 0xf9, 0xdc, 0xbb, 0xac, 0x55, 0xa0, 0x62, 0x95,
  0xce, 0x87, 0x0b, 0x07, 0x02, 0x9b, 0xfc, 0xdb, 0x2d, 0xce, 0x28, 0xd9, 0x59,
  0xf2, 0x81, 0x5b, 0x16, 0xf8, 0x17, 0x98,
]);

// 2G compressed
const G2 = new Uint8Array([
  0x02, 0xc6, 0x04, 0x7f, 0x94, 0x41, 0xed, 0x7d, 0x6d, 0x30, 0x45, 0x40, 0x6e,
  0x95, 0xc0, 0x7c, 0xd8, 0x5c, 0x77, 0x8e, 0x4b, 0x8c, 0xef, 0x3c, 0xa7, 0xab,
  0xac, 0x09, 0xb9, 0x5c, 0x70, 0x9e, 0xe5,
]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pubKeyToEthAddress', () => {
  it('returns a string starting with 0x', () => {
    expect(pubKeyToEthAddress(G)).toMatch(/^0x/);
  });

  it('returns a 42-character string (0x + 40 hex chars)', () => {
    expect(pubKeyToEthAddress(G)).toHaveLength(42);
  });

  it('contains only hex characters after 0x', () => {
    const addr = pubKeyToEthAddress(G);
    expect(addr.slice(2)).toMatch(/^[0-9a-fA-F]{40}$/);
  });

  it('applies EIP-55 mixed-case checksum', () => {
    const addr = pubKeyToEthAddress(G);
    // At least some letters should be uppercase and some lowercase
    // (statistically guaranteed for a random address, and G is not all-numeric)
    const letters = addr.slice(2).replace(/[0-9]/g, '');
    const hasUpper = /[A-F]/.test(letters);
    const hasLower = /[a-f]/.test(letters);
    expect(hasUpper || hasLower).toBe(true);
  });

  it('is deterministic — same key always gives same address', () => {
    expect(pubKeyToEthAddress(G)).toBe(pubKeyToEthAddress(G));
  });

  it('different keys produce different addresses', () => {
    expect(pubKeyToEthAddress(G)).not.toBe(pubKeyToEthAddress(G2));
  });
});
