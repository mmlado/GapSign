/* eslint-disable no-bitwise */
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import * as secp from '@noble/secp256k1';
import Keycard from 'keycard-sdk';
import { hexToBytes } from 'viem';

import { ensureHexPrefix } from './hex';

// ── Keycard TLV tags ─────────────────────────────────────────────────────────
const TLV_SIGNATURE_TEMPLATE = 0xa0;
const TLV_PUB_KEY = 0x80;
const TLV_ECDSA_TEMPLATE = 0x30;
const TLV_INTEGER = 0x02;

// ── secp256k1 / Ethereum ─────────────────────────────────────────────────────
const SCALAR_BYTES = 32;
const V_BASE_LEGACY = 27; // EIP-712 / personal_sign: v = 27 + recId
const V_BASE_EIP155 = 35; // legacy EIP-155 tx:        v = 35 + 2*chainId + recId

// ── Helpers ──────────────────────────────────────────────────────────────────

function derIntTo32(arr: Uint8Array): Uint8Array {
  const stripped = arr[0] === 0x00 ? arr.slice(1) : arr;
  if (stripped.length === SCALAR_BYTES) {
    return stripped;
  }
  const padded = new Uint8Array(SCALAR_BYTES);
  padded.set(stripped, SCALAR_BYTES - stripped.length);
  return padded;
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

/**
 * Parse the raw Keycard signature TLV, compute v, and wrap in a
 * `ur:eth-signature` UR string ready to display as a QR code.
 *
 * @param signRespDataHex - hex string of `signResp.data` (TLV from Keycard)
 * @param hash            - the 32-byte hash that was signed (for recId recovery)
 * @param dataType        - eth-sign-request dataType (1=legacy, 2=typed, 3=personal, 4=EIP-1559)
 * @param chainId         - chain ID (used for legacy tx v calculation)
 * @param requestId       - optional UUID hex from the original eth-sign-request
 * @param txType          - optional EIP-2718 transaction type byte (e.g. 0x01 for EIP-2930)
 */
export function buildEthSignatureUR(
  signRespDataHex: string,
  hash: Uint8Array,
  dataType: number | undefined,
  chainId: number | undefined,
  requestId: string | undefined,
  txType?: number,
): string {
  const tlv = new Keycard.BERTLV(hexToBytes(ensureHexPrefix(signRespDataHex)));
  tlv.enterConstructed(TLV_SIGNATURE_TEMPLATE);
  const pubKeyRaw = tlv.readPrimitive(TLV_PUB_KEY);
  tlv.enterConstructed(TLV_ECDSA_TEMPLATE);
  const r = derIntTo32(tlv.readPrimitive(TLV_INTEGER));
  const s = derIntTo32(tlv.readPrimitive(TLV_INTEGER));

  const compressedPubKey = Keycard.CryptoUtils.compressPublicKey(pubKeyRaw);
  const compact = concat(r, s);

  let recId = -1;
  for (let i = 0; i < 2; i++) {
    // secp256k1 v3 'recovered' format: recId[1] || r[32] || s[32]
    const recovered = new Uint8Array(1 + 2 * SCALAR_BYTES);
    recovered[0] = i;
    recovered.set(compact, 1);
    const candidate = secp.recoverPublicKey(recovered, hash, {
      prehash: false,
    });
    if (uint8ArrayEqual(candidate, compressedPubKey)) {
      recId = i;
      break;
    }
  }

  if (recId === -1) {
    throw new Error('[ethSignature] Cannot determine recovery ID');
  }

  let v: number;
  if (txType === 0x01) {
    // EIP-2930: v = recId (same as EIP-1559, no chain ID encoding)
    v = recId;
  } else {
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
  }

  const sig = concat(r, s, encodeV(v));
  const requestIdBuf = requestId
    ? Buffer.from(requestId.replace(/-/g, ''), 'hex')
    : undefined;
  const ethSig = new ETHSignature(Buffer.from(sig), requestIdBuf, 'GapSign');
  const urString = ethSig.toUREncoder(1000).nextPart();

  return urString;
}
