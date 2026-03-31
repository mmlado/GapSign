import CBOR from 'cbor-sync';
import {
  coinTypeFromPath,
  compressPubKey,
  derivationPathToKeypath,
  numberToFingerprintBuffer,
  parseExtendedKeyFromTLV,
  parseKeyFromTLV,
} from '../src/utils/hdKeyUtils';

// ---------------------------------------------------------------------------
// TLV builder helpers (mirrors the Keycard card response format)
// ---------------------------------------------------------------------------

function tlvEncode(tag: number, data: Uint8Array): Uint8Array {
  const len = data.length;
  let header: Uint8Array;
  if (len < 0x80) {
    header = new Uint8Array([tag, len]);
  } else {
    header = new Uint8Array([tag, 0x81, len]);
  }
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

function buildExportKeyTLV(
  pubKey: Uint8Array,
  chainCode: Uint8Array,
): Uint8Array {
  const inner = concat(tlvEncode(0x80, pubKey), tlvEncode(0x82, chainCode));
  return tlvEncode(0xa1, inner);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Uncompressed public key: 0x04 || x (32 bytes) || y (32 bytes)
// x[31] = 1 so x is non-zero; y = all zeros (even) → compressed prefix 0x02
const PUB_KEY_EVEN_Y = new Uint8Array(65);
PUB_KEY_EVEN_Y[0] = 0x04;
PUB_KEY_EVEN_Y[32] = 0x01; // x[31] = 1

// y[63] = 1 (odd) → compressed prefix 0x03
const PUB_KEY_ODD_Y = new Uint8Array(65);
PUB_KEY_ODD_Y[0] = 0x04;
PUB_KEY_ODD_Y[32] = 0x01;
PUB_KEY_ODD_Y[64] = 0x01; // y[31] = 1 (odd)

const CHAIN_CODE = new Uint8Array(32).fill(0xab);

// ---------------------------------------------------------------------------
// compressPubKey
// ---------------------------------------------------------------------------

describe('compressPubKey', () => {
  it('returns a 33-byte buffer', () => {
    const result = compressPubKey(PUB_KEY_EVEN_Y);
    expect(result.length).toBe(33);
  });

  it('uses prefix 0x02 for even y', () => {
    const result = compressPubKey(PUB_KEY_EVEN_Y);
    expect(result[0]).toBe(0x02);
  });

  it('uses prefix 0x03 for odd y', () => {
    const result = compressPubKey(PUB_KEY_ODD_Y);
    expect(result[0]).toBe(0x03);
  });

  it('x-coordinate in bytes 1..32 matches the input', () => {
    const result = compressPubKey(PUB_KEY_EVEN_Y);
    const x = Array.from(result.slice(1));
    const expected = Array.from(PUB_KEY_EVEN_Y.slice(1, 33));
    expect(x).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// numberToFingerprintBuffer
// ---------------------------------------------------------------------------

describe('numberToFingerprintBuffer', () => {
  it('encodes 0x12345678 as big-endian bytes', () => {
    const buf = numberToFingerprintBuffer(0x12345678);
    expect(Array.from(buf)).toEqual([0x12, 0x34, 0x56, 0x78]);
  });

  it('encodes 0 as four zero bytes', () => {
    const buf = numberToFingerprintBuffer(0);
    expect(Array.from(buf)).toEqual([0x00, 0x00, 0x00, 0x00]);
  });

  it('encodes 0xffffffff correctly', () => {
    const buf = numberToFingerprintBuffer(0xffffffff);
    expect(Array.from(buf)).toEqual([0xff, 0xff, 0xff, 0xff]);
  });

  it('returns a 4-byte Buffer', () => {
    const buf = numberToFingerprintBuffer(1);
    expect(buf.length).toBe(4);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// coinTypeFromPath
// ---------------------------------------------------------------------------

describe('coinTypeFromPath', () => {
  it("extracts 60 from m/44'/60'/0'", () => {
    expect(coinTypeFromPath("m/44'/60'/0'")).toBe(60);
  });

  it("extracts 0 from m/44'/0'/0'", () => {
    expect(coinTypeFromPath("m/44'/0'/0'")).toBe(0);
  });

  it("extracts 1 from m/84'/1'/0' (testnet)", () => {
    expect(coinTypeFromPath("m/84'/1'/0'")).toBe(1);
  });

  it('returns 0 for unrecognised path', () => {
    expect(coinTypeFromPath('m/0')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// derivationPathToKeypath — spot-check via CBOR round-trip
// ---------------------------------------------------------------------------

describe('derivationPathToKeypath', () => {
  const FINGERPRINT = 0xdeadbeef;

  function encodeKeypath(path: string): Record<number, any> {
    const keypath = derivationPathToKeypath(path, FINGERPRINT);
    const cbor = keypath.toCBOR();
    return CBOR.decode(cbor);
  }

  it("encodes depth 3 for m/44'/60'/0'", () => {
    const map = encodeKeypath("m/44'/60'/0'");
    expect(map[3]).toBe(3);
  });

  it('encodes depth 2 for m/0/1', () => {
    const map = encodeKeypath('m/0/1');
    expect(map[3]).toBe(2);
  });

  it('includes source fingerprint matching the input value', () => {
    const keypath = derivationPathToKeypath("m/44'/60'/0'", FINGERPRINT);
    // getSourceFingerprint() returns the fingerprint as a Buffer
    const fp = keypath.getSourceFingerprint()!;
    expect(fp.length).toBe(4);
    expect(new DataView(fp.buffer, fp.byteOffset, 4).getUint32(0)).toBe(
      FINGERPRINT,
    );
  });
});

// ---------------------------------------------------------------------------
// parseKeyFromTLV  (simple Keycard BERTLV — exportKey response)
// ---------------------------------------------------------------------------

describe('parseKeyFromTLV', () => {
  it('extracts the pubkey and chainCode from a valid TLV', () => {
    const tlv = buildExportKeyTLV(PUB_KEY_EVEN_Y, CHAIN_CODE);
    const { pubKeyUncompressed, chainCode } = parseKeyFromTLV(tlv);
    expect(Array.from(pubKeyUncompressed)).toEqual(Array.from(PUB_KEY_EVEN_Y));
    expect(Array.from(chainCode)).toEqual(Array.from(CHAIN_CODE));
  });

  it('throws on malformed input', () => {
    expect(() => parseKeyFromTLV(new Uint8Array([0x00, 0x00]))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseExtendedKeyFromTLV  (manual parser — exportExtendedKey response)
// ---------------------------------------------------------------------------

describe('parseExtendedKeyFromTLV', () => {
  it('extracts the pubkey and chainCode from a valid TLV', () => {
    const tlv = buildExportKeyTLV(PUB_KEY_EVEN_Y, CHAIN_CODE);
    const { pubKeyUncompressed, chainCode } = parseExtendedKeyFromTLV(tlv);
    expect(Array.from(pubKeyUncompressed)).toEqual(Array.from(PUB_KEY_EVEN_Y));
    expect(Array.from(chainCode)).toEqual(Array.from(CHAIN_CODE));
  });

  it('handles long-form length encoding (0x81 prefix) for pubkey', () => {
    // Build a pubkey larger than 127 bytes to trigger the 0x81 length prefix
    const bigPubKey = new Uint8Array(128).fill(0x04);
    const tlv = buildExportKeyTLV(bigPubKey, CHAIN_CODE);
    const { pubKeyUncompressed } = parseExtendedKeyFromTLV(tlv);
    expect(Array.from(pubKeyUncompressed)).toEqual(Array.from(bigPubKey));
  });

  it('throws on wrong outer tag', () => {
    const bad = new Uint8Array([
      0xff, 0x04, 0x80, 0x01, 0x00, 0x82, 0x01, 0x00,
    ]);
    expect(() => parseExtendedKeyFromTLV(bad)).toThrow(/Expected tag/);
  });

  it('throws on wrong pubkey tag', () => {
    // 0xa1 outer, then wrong inner tag
    const inner = concat(
      tlvEncode(0x99, PUB_KEY_EVEN_Y),
      tlvEncode(0x82, CHAIN_CODE),
    );
    const bad = tlvEncode(0xa1, inner);
    expect(() => parseExtendedKeyFromTLV(bad)).toThrow(/Expected tag/);
  });

  it('throws on trailing data inside the template', () => {
    // Add an extra byte inside the outer TLV
    const inner = concat(
      tlvEncode(0x80, PUB_KEY_EVEN_Y),
      tlvEncode(0x82, CHAIN_CODE),
      new Uint8Array([0x00]),
    );
    const bad = tlvEncode(0xa1, inner);
    expect(() => parseExtendedKeyFromTLV(bad)).toThrow(/Unexpected trailing/);
  });
});
