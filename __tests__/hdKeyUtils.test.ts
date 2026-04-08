import CBOR from 'cbor-sync';
import {
  coinTypeFromPath,
  derivationPathToKeypath,
  numberToFingerprintBuffer,
} from '../src/utils/hdKeyUtils';

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
