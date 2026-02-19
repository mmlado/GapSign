/* eslint-disable no-bitwise */
import Keycard from 'keycard-sdk';
import * as secp from '@noble/secp256k1';
import {UREncoder, UR} from '@ngraveio/bc-ur';

// ── Keycard TLV tags ─────────────────────────────────────────────────────────
const TLV_SIGNATURE_TEMPLATE = 0xa0; // constructed tag wrapping the full signature
const TLV_PUB_KEY            = 0x80; // uncompressed public key, 65 bytes
const TLV_ECDSA_TEMPLATE     = 0x30; // DER SEQUENCE containing r and s
const TLV_INTEGER            = 0x02; // DER INTEGER (used for both r and s)

// ── CBOR encoding ────────────────────────────────────────────────────────────
const CBOR_SMALL_MAX   = 23;    // max value/length that fits in the major-type byte
const CBOR_BYTES_SMALL = 0x40;  // major type 2 (byte string) — length in low 5 bits
const CBOR_BYTES_U8    = 0x58;  // major type 2 — 1-byte length follows
const CBOR_BYTES_U16   = 0x59;  // major type 2 — 2-byte length follows
const CBOR_TEXT_SMALL  = 0x60;  // major type 3 (text string) — length in low 5 bits
const CBOR_TEXT_U8     = 0x78;  // major type 3 — 1-byte length follows
const CBOR_MAP_SMALL   = 0xa0;  // major type 5 (map) — count in low 5 bits
const CBOR_TAG_U8      = 0xd8;  // major type 6 (tag) — 1-byte tag number follows
const CBOR_TAG_UUID    = 0x25;  // tag 37: RFC 4122 UUID

// ── ERC-4527 eth-signature CBOR map keys ────────────────────────────────────
const KEY_REQUEST_ID = 1;
const KEY_SIGNATURE  = 2;
const KEY_ORIGIN     = 3;

// ── secp256k1 / Ethereum ─────────────────────────────────────────────────────
const SCALAR_BYTES       = 32;  // r and s are 256-bit (32-byte) scalars
const PUBKEY_PREFIX_EVEN = 0x02;
const PUBKEY_PREFIX_ODD  = 0x03;
const V_BASE_LEGACY      = 27;  // EIP-712 / personal_sign: v = 27 + recId
const V_BASE_EIP155      = 35;  // legacy EIP-155 tx:        v = 35 + 2*chainId + recId

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function derIntTo32(arr: Uint8Array): Uint8Array {
  const stripped = arr[0] === 0x00 ? arr.slice(1) : arr;
  if (stripped.length === SCALAR_BYTES) {
    return stripped;
  }
  const padded = new Uint8Array(SCALAR_BYTES);
  padded.set(stripped, SCALAR_BYTES - stripped.length);
  return padded;
}

function compressPubKey(uncompressed: Uint8Array): Uint8Array {
  const x = uncompressed.slice(1, 1 + SCALAR_BYTES);
  const y = uncompressed.slice(1 + SCALAR_BYTES, 1 + 2 * SCALAR_BYTES);
  const prefix = (y[SCALAR_BYTES - 1] & 1) === 0 ? PUBKEY_PREFIX_EVEN : PUBKEY_PREFIX_ODD;
  const compressed = new Uint8Array(1 + SCALAR_BYTES);
  compressed[0] = prefix;
  compressed.set(x, 1);
  return compressed;
}

function uint8ArrayEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function uuidToBytes(uuid: string): Uint8Array {
  return hexToBytes(uuid.replace(/-/g, ''));
}

function encodeV(v: number): Uint8Array {
  if (v <= 0xff) {
    return new Uint8Array([v]);
  }
  if (v <= 0xffff) {
    return new Uint8Array([(v >> 8) & 0xff, v & 0xff]);
  }
  if (v <= 0xffffff) {
    return new Uint8Array([(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]);
  }
  return new Uint8Array([
    (v >> 24) & 0xff,
    (v >> 16) & 0xff,
    (v >> 8) & 0xff,
    v & 0xff,
  ]);
}

function cborUint(n: number): Uint8Array {
  return new Uint8Array([n]);
}

function cborBytes(data: Uint8Array): Uint8Array {
  let header: Uint8Array;
  if (data.length <= CBOR_SMALL_MAX) {
    header = new Uint8Array([CBOR_BYTES_SMALL | data.length]);
  } else if (data.length <= 0xff) {
    header = new Uint8Array([CBOR_BYTES_U8, data.length]);
  } else {
    header = new Uint8Array([CBOR_BYTES_U16, (data.length >> 8) & 0xff, data.length & 0xff]);
  }
  const out = new Uint8Array(header.length + data.length);
  out.set(header, 0);
  out.set(data, header.length);
  return out;
}

function cborText(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    bytes[i] = s.charCodeAt(i);
  }
  let header: Uint8Array;
  if (bytes.length <= CBOR_SMALL_MAX) {
    header = new Uint8Array([CBOR_TEXT_SMALL | bytes.length]);
  } else {
    header = new Uint8Array([CBOR_TEXT_U8, bytes.length]);
  }
  const out = new Uint8Array(header.length + bytes.length);
  out.set(header, 0);
  out.set(bytes, header.length);
  return out;
}

function cborTag37Bytes(data: Uint8Array): Uint8Array {
  const tagHeader = new Uint8Array([CBOR_TAG_U8, CBOR_TAG_UUID]);
  const encoded = cborBytes(data);
  const out = new Uint8Array(tagHeader.length + encoded.length);
  out.set(tagHeader, 0);
  out.set(encoded, tagHeader.length);
  return out;
}

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

function buildCbor(sig: Uint8Array, requestId?: string): Uint8Array {
  const hasRequestId = requestId !== undefined && requestId.length > 0;
  const mapSize = hasRequestId ? 3 : 2;
  const mapHeader = new Uint8Array([CBOR_MAP_SMALL | mapSize]);

  const keySig = cborUint(KEY_SIGNATURE);
  const valSig = cborBytes(sig);
  const keyOrigin = cborUint(KEY_ORIGIN);
  const valOrigin = cborText('GapSign');

  if (!hasRequestId) {
    return concat(mapHeader, keySig, valSig, keyOrigin, valOrigin);
  }

  const keyId = cborUint(KEY_REQUEST_ID);
  const valId = cborTag37Bytes(uuidToBytes(requestId!));
  return concat(mapHeader, keyId, valId, keySig, valSig, keyOrigin, valOrigin);
}

/**
 * Parse the raw Keycard signature TLV, compute v, CBOR-encode per ERC-4527,
 * and wrap in a `ur:eth-signature` UR string ready to display as a QR code.
 *
 * @param signRespDataHex - hex string of `signResp.data` (TLV from Keycard)
 * @param hash            - the 32-byte hash that was signed (for recId recovery)
 * @param dataType        - eth-sign-request dataType (1=legacy, 2=typed, 3=personal, 4=EIP-1559)
 * @param chainId         - chain ID (used for legacy tx v calculation)
 * @param requestId       - optional UUID from the original eth-sign-request
 */
export function buildEthSignatureUR(
  signRespDataHex: string,
  hash: Uint8Array,
  dataType: number | undefined,
  chainId: number | undefined,
  requestId: string | undefined,
): string {
  const tlv = new Keycard.BERTLV(hexToBytes(signRespDataHex));
  tlv.enterConstructed(TLV_SIGNATURE_TEMPLATE);
  const pubKeyRaw = tlv.readPrimitive(TLV_PUB_KEY);
  tlv.enterConstructed(TLV_ECDSA_TEMPLATE);
  const r = derIntTo32(tlv.readPrimitive(TLV_INTEGER));
  const s = derIntTo32(tlv.readPrimitive(TLV_INTEGER));

  console.log(`[ethSignature] r: ${Array.from(r).map(b => b.toString(16).padStart(2, '0')).join('')}`);
  console.log(`[ethSignature] s: ${Array.from(s).map(b => b.toString(16).padStart(2, '0')).join('')}`);

  const compressedPubKey = compressPubKey(pubKeyRaw);
  const compact = concat(r, s);

  let recId = -1;
  for (let i = 0; i < 2; i++) {
    // secp256k1 v3 'recovered' format: recId[1] || r[32] || s[32]
    const recovered = new Uint8Array(1 + 2 * SCALAR_BYTES);
    recovered[0] = i;
    recovered.set(compact, 1);
    const candidate = secp.recoverPublicKey(recovered, hash, {prehash: false});
    if (uint8ArrayEqual(candidate, compressedPubKey)) {
      recId = i;
      break;
    }
  }

  if (recId === -1) {
    throw new Error('[ethSignature] Cannot determine recovery ID');
  }
  console.log(`[ethSignature] recId: ${recId}`);

  let v: number;
  switch (dataType) {
    case 1: // legacy transaction (EIP-155)
      v = V_BASE_EIP155 + 2 * (chainId ?? 0) + recId;
      break;
    case 4: // EIP-1559
      v = recId;
      break;
    default: // EIP-712 (2), personal_sign (3), unknown
      v = V_BASE_LEGACY + recId;
  }
  console.log(`[ethSignature] v: ${v} (dataType=${dataType}, chainId=${chainId})`);

  const vBytes = encodeV(v);
  const sig = concat(r, s, vBytes);
  const cbor = buildCbor(sig, requestId);
  const ur = new UR(Buffer.from(cbor), 'eth-signature');
  const urString = UREncoder.encodeSinglePart(ur);
  console.log(`[ethSignature] UR: ${urString.slice(0, 60)}...`);
  return urString;
}
