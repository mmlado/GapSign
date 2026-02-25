/* eslint-disable no-bitwise */
import Keycard from 'keycard-sdk';
import {UREncoder, UR} from '@ngraveio/bc-ur';

// ── Keycard TLV tags ──────────────────────────────────────────────────────────
const TLV_KEY_TEMPLATE = 0xa1;  // constructed tag wrapping the exported key pair
const TLV_PUB_KEY      = 0x80;  // uncompressed public key, 65 bytes
const TLV_CHAIN_CODE   = 0x82;  // BIP32 chain code, 32 bytes

// ── CBOR constants ────────────────────────────────────────────────────────────
const CBOR_BYTES_U8 = 0x58;   // major type 2 (byte string), 1-byte length follows
const CBOR_TRUE     = 0xf5;
const CBOR_FALSE    = 0xf4;
const CBOR_TAG_U16  = 0xd9;   // major type 6 (tag), 2-byte tag number follows

// BC-UR crypto-hdkey field numbers (BCR-2020-007 / keycard-shell cddl)
const KEY_IS_PRIVATE = 2;
const KEY_DATA       = 3;
const KEY_CHAIN_CODE = 4;
const KEY_ORIGIN     = 6;
const KEY_NAME       = 9;

// crypto-keypath field numbers (BCR-2020-006)
const KEYPATH_COMPONENTS = 1;
const KEYPATH_DEPTH      = 3;
const CRYPTO_KEYPATH_TAG = 304;  // 0x0130

const SCALAR_BYTES = 32;

// ── CBOR helpers ──────────────────────────────────────────────────────────────

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/** Encode an unsigned integer (major type 0). */
function cborUint(n: number): Uint8Array {
  if (n < 24)      return new Uint8Array([n]);
  if (n < 256)     return new Uint8Array([0x18, n]);
  return                  new Uint8Array([0x19, (n >> 8) & 0xff, n & 0xff]);
}

function cborBool(b: boolean): Uint8Array {
  return new Uint8Array([b ? CBOR_TRUE : CBOR_FALSE]);
}

/** Encode a byte string (major type 2) — data must be ≤ 255 bytes. */
function cborByteString(data: Uint8Array): Uint8Array {
  return concat(new Uint8Array([CBOR_BYTES_U8, data.length]), data);
}

/** Encode a definite-length array (major type 4). */
function cborArray(items: Uint8Array[]): Uint8Array {
  const n = items.length;
  const header = n < 24
    ? new Uint8Array([0x80 | n])
    : new Uint8Array([0x98, n]);
  return concat(header, ...items);
}

/** Encode a definite-length map (major type 5). Entries must fit in a single byte count. */
function cborMap(entries: [Uint8Array, Uint8Array][]): Uint8Array {
  const header = new Uint8Array([0xa0 | entries.length]);
  return concat(header, ...entries.flat());
}

/** Encode a CBOR tag for tags in the range 256–65535. */
function cborTag16(tag: number, content: Uint8Array): Uint8Array {
  return concat(new Uint8Array([CBOR_TAG_U16, (tag >> 8) & 0xff, tag & 0xff]), content);
}

/** Encode a UTF-8 text string (major type 3) — must be ≤ 23 bytes. */
function cborText(s: string): Uint8Array {
  const bytes = new TextEncoder().encode(s);
  return concat(new Uint8Array([0x60 | bytes.length]), bytes);
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function compressPubKey(uncompressed: Uint8Array): Uint8Array {
  const x = uncompressed.slice(1, 1 + SCALAR_BYTES);
  const y = uncompressed.slice(1 + SCALAR_BYTES);
  const prefix = (y[SCALAR_BYTES - 1] & 1) === 0 ? 0x02 : 0x03;
  return concat(new Uint8Array([prefix]), x);
}

// ── Derivation path ───────────────────────────────────────────────────────────

function buildCryptoKeypath(derivationPath: string): Uint8Array {
  const parts = derivationPath.split('/').slice(1); // drop 'm'
  const depth = parts.length;

  // crypto-keypath components: flat array of [index, hardened_bool, ...]
  const componentItems = parts.flatMap(part => {
    const hardened = part.endsWith("'");
    const index = parseInt(hardened ? part.slice(0, -1) : part, 10);
    return [cborUint(index), cborBool(hardened)];
  });

  const keypathCbor = cborMap([
    [cborUint(KEYPATH_COMPONENTS), cborArray(componentItems)],
    [cborUint(KEYPATH_DEPTH),      cborUint(depth)],
  ]);

  return cborTag16(CRYPTO_KEYPATH_TAG, keypathCbor);
}

// ── Public export ─────────────────────────────────────────────────────────────

/**
 * Parse the raw Keycard exportKey TLV response, CBOR-encode it as a
 * crypto-hdkey (BCR-2020-007), and return a `ur:crypto-hdkey/...` string
 * ready to display as a QR code.
 *
 * MetaMask can scan this to add the Keycard account to the wallet.
 *
 * @param exportRespData - raw bytes from `cmdSet.exportKey()` response
 * @param derivationPath - BIP32 path used, e.g. "m/44'/60'/0'"
 */
export function buildCryptoHdKeyUR(
  exportRespData: Uint8Array,
  derivationPath: string,
): string {
  const tlv = new Keycard.BERTLV(exportRespData);
  tlv.enterConstructed(TLV_KEY_TEMPLATE);
  const pubKeyUncompressed = tlv.readPrimitive(TLV_PUB_KEY);
  const chainCode = tlv.readPrimitive(TLV_CHAIN_CODE);

  const pubKeyCompressed = compressPubKey(pubKeyUncompressed);
  const keypath = buildCryptoKeypath(derivationPath);

  const cbor = cborMap([
    [cborUint(KEY_IS_PRIVATE), cborBool(false)],
    [cborUint(KEY_DATA),       cborByteString(pubKeyCompressed)],
    [cborUint(KEY_CHAIN_CODE), cborByteString(chainCode)],
    [cborUint(KEY_ORIGIN),     keypath],
    [cborUint(KEY_NAME),       cborText('GapSign')],
  ]);

  const ur = new UR(Buffer.from(cbor), 'crypto-hdkey');
  return UREncoder.encodeSinglePart(ur);
}
