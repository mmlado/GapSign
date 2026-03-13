import {
  parseExtendedKeyFromTLV,
  deriveAddresses,
} from '../src/utils/hdAddress';

// ---------------------------------------------------------------------------
// Mock @scure/bip32 — captures constructor args without requiring real keys
// ---------------------------------------------------------------------------

jest.mock('@scure/bip32', () => ({
  HDKey: jest.fn().mockImplementation((params: any) => ({ ...params })),
}));

import { HDKey } from '@scure/bip32';
const MockHDKey = HDKey as jest.MockedClass<any>;

// ---------------------------------------------------------------------------
// TLV builder helpers (mirrors Keycard card response format)
// ---------------------------------------------------------------------------

function tlvEncode(tag: number, data: Uint8Array): Uint8Array {
  const len = data.length;
  const header =
    len < 0x80 ? new Uint8Array([tag, len]) : new Uint8Array([tag, 0x81, len]);
  const out = new Uint8Array(header.length + len);
  out.set(header, 0);
  out.set(data, header.length);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function buildTLV(pubKeyUncompressed: Uint8Array, chainCode: Uint8Array) {
  const inner = concat(
    tlvEncode(0x80, pubKeyUncompressed),
    tlvEncode(0x82, chainCode),
  );
  return tlvEncode(0xa1, inner);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CHAIN_CODE = new Uint8Array(32).fill(0xcc);

// Uncompressed key with even y (last byte of y = 0x00 → even → prefix 0x02)
const PUB_KEY_EVEN_Y = new Uint8Array(65);
PUB_KEY_EVEN_Y[0] = 0x04;
PUB_KEY_EVEN_Y[1] = 0xab; // x byte
PUB_KEY_EVEN_Y[64] = 0x00; // y last byte, even

// Uncompressed key with odd y (last byte of y = 0x01 → odd → prefix 0x03)
const PUB_KEY_ODD_Y = new Uint8Array(65);
PUB_KEY_ODD_Y[0] = 0x04;
PUB_KEY_ODD_Y[1] = 0xcd; // x byte
PUB_KEY_ODD_Y[64] = 0x01; // y last byte, odd

// ---------------------------------------------------------------------------
// Tests: parseExtendedKeyFromTLV
// ---------------------------------------------------------------------------

describe('parseExtendedKeyFromTLV', () => {
  beforeEach(() => {
    MockHDKey.mockClear();
  });

  it('creates an HDKey with a 33-byte compressed public key', () => {
    parseExtendedKeyFromTLV(buildTLV(PUB_KEY_EVEN_Y, CHAIN_CODE));
    const { publicKey } = MockHDKey.mock.calls[0][0];
    expect(publicKey).toBeInstanceOf(Uint8Array);
    expect(publicKey.length).toBe(33);
  });

  it('uses prefix 0x02 for even y', () => {
    parseExtendedKeyFromTLV(buildTLV(PUB_KEY_EVEN_Y, CHAIN_CODE));
    const { publicKey } = MockHDKey.mock.calls[0][0];
    expect(publicKey[0]).toBe(0x02);
  });

  it('uses prefix 0x03 for odd y', () => {
    parseExtendedKeyFromTLV(buildTLV(PUB_KEY_ODD_Y, CHAIN_CODE));
    const { publicKey } = MockHDKey.mock.calls[0][0];
    expect(publicKey[0]).toBe(0x03);
  });

  it('passes the x coordinate as bytes 1–32 of the compressed key', () => {
    parseExtendedKeyFromTLV(buildTLV(PUB_KEY_EVEN_Y, CHAIN_CODE));
    const { publicKey } = MockHDKey.mock.calls[0][0];
    // PUB_KEY_EVEN_Y[1] = 0xab, corresponds to compressedKey[1]
    expect(publicKey[1]).toBe(0xab);
  });

  it('passes the chain code unchanged', () => {
    parseExtendedKeyFromTLV(buildTLV(PUB_KEY_EVEN_Y, CHAIN_CODE));
    const { chainCode } = MockHDKey.mock.calls[0][0];
    expect(Array.from(chainCode)).toEqual(Array.from(CHAIN_CODE));
  });

  it('throws on malformed TLV data', () => {
    expect(() =>
      parseExtendedKeyFromTLV(new Uint8Array([0x00, 0x00])),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tests: deriveAddresses
// ---------------------------------------------------------------------------

describe('deriveAddresses', () => {
  const makeExternalKey = () => ({
    deriveChild: jest.fn((i: number) => ({ publicKey: new Uint8Array([i]) })),
  });

  it('returns the requested number of addresses', () => {
    const key = makeExternalKey();
    const addrFn = jest.fn(() => 'addr');
    const result = deriveAddresses(key as any, 5, addrFn);
    expect(result).toHaveLength(5);
  });

  it('calls addrFn with the child publicKey for each index', () => {
    const key = makeExternalKey();
    const addrFn = jest.fn((pk: Uint8Array) => `0x${pk[0]}`);
    const result = deriveAddresses(key as any, 3, addrFn);
    expect(addrFn).toHaveBeenCalledTimes(3);
    expect(result).toEqual(['0x0', '0x1', '0x2']);
  });

  it('respects startIndex', () => {
    const key = makeExternalKey();
    const addrFn = jest.fn((pk: Uint8Array) => `0x${pk[0]}`);
    const result = deriveAddresses(key as any, 3, addrFn, 10);
    expect(result).toEqual(['0x10', '0x11', '0x12']);
    expect(key.deriveChild).toHaveBeenNthCalledWith(1, 10);
    expect(key.deriveChild).toHaveBeenNthCalledWith(2, 11);
    expect(key.deriveChild).toHaveBeenNthCalledWith(3, 12);
  });

  it('returns empty array for count = 0', () => {
    const key = makeExternalKey();
    const addrFn = jest.fn();
    expect(deriveAddresses(key as any, 0, addrFn)).toEqual([]);
    expect(addrFn).not.toHaveBeenCalled();
  });
});
