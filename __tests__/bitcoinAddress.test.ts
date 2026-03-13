import { pubKeyToBtcAddress } from '../src/utils/bitcoinAddress';

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

describe('pubKeyToBtcAddress', () => {
  it('returns a native SegWit address starting with bc1q', () => {
    expect(pubKeyToBtcAddress(G)).toMatch(/^bc1q/);
  });

  it('returns a bech32 address of the correct length (42 chars for P2WPKH)', () => {
    // P2WPKH bech32 address: bc1q + 39 chars = 42 total
    expect(pubKeyToBtcAddress(G)).toHaveLength(42);
  });

  it('contains only valid bech32 characters after bc1', () => {
    const addr = pubKeyToBtcAddress(G);
    // bech32 charset: q p z r y 9 x 8 g f 2 t v d w 0 s 3 j n 5 4 k h c e 6 m u a 7 l
    expect(addr.slice(3)).toMatch(/^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/);
  });

  it('is deterministic — same key always gives same address', () => {
    expect(pubKeyToBtcAddress(G)).toBe(pubKeyToBtcAddress(G));
  });

  it('different keys produce different addresses', () => {
    expect(pubKeyToBtcAddress(G)).not.toBe(pubKeyToBtcAddress(G2));
  });
});
