/* eslint-disable no-bitwise */
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import Keycard from 'keycard-sdk';
import { hexToBytes } from 'viem';

import { ensureHexPrefix } from './hex';

// ── secp256k1 / Ethereum ─────────────────────────────────────────────────────
const SCALAR_BYTES = 32;
const V_BASE_LEGACY = 27; // EIP-712 / personal_sign: v = 27 + recId
const V_BASE_EIP155 = 35; // legacy EIP-155 tx:        v = 35 + 2*chainId + recId

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad32(arr: Uint8Array): Uint8Array {
  if (arr.length === SCALAR_BYTES) {
    return arr;
  }
  const padded = new Uint8Array(SCALAR_BYTES);
  padded.set(arr, SCALAR_BYTES - arr.length);
  return padded;
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

/**
 * Parse the raw Keycard signature TLV, compute v, and wrap in a
 * `ur:eth-signature` UR string ready to display as a QR code.
 *
 * @param signRespDataHex - hex string of `signResp.data` (TLV from Keycard)
 * @param hash            - the 32-byte hash that was signed (for recId recovery)
 * @param dataType        - eth-sign-request dataType (1=legacy, 2=typed, 3=personal, 4=typed transaction)
 * @param chainId         - chain ID (used for legacy tx v calculation)
 * @param requestId       - optional UUID hex from the original eth-sign-request
 * @param txType          - optional EIP-2718 transaction type byte (0x01 EIP-2930, 0x02 EIP-1559)
 */
export function buildEthSignatureUR(
  signRespDataHex: string,
  hash: Uint8Array,
  dataType: number | undefined,
  chainId: number | undefined,
  requestId: string | undefined,
  txType?: number,
): string {
  const sig = new Keycard.RecoverableSignature({
    hash,
    tlvData: hexToBytes(ensureHexPrefix(signRespDataHex)),
  });

  const recId = sig.recId!;
  const r = pad32(sig.r!);
  const s = pad32(sig.s!);

  let v: number;
  if (txType === 0x01 || txType === 0x02) {
    // Typed transactions use yParity directly: v = recId.
    v = recId;
  } else {
    switch (dataType) {
      case 1: // legacy transaction (EIP-155)
        v = V_BASE_EIP155 + 2 * (chainId ?? 0) + recId;
        break;
      case 4: // typed transaction without an explicit txType
        v = recId;
        break;
      default: // EIP-712 (2), personal_sign (3), unknown
        v = V_BASE_LEGACY + recId;
    }
  }

  const sigBytes = new Uint8Array(r.length + s.length + encodeV(v).length);
  sigBytes.set(r, 0);
  sigBytes.set(s, r.length);
  sigBytes.set(encodeV(v), r.length + s.length);

  const requestIdBuf = requestId
    ? Buffer.from(requestId.replace(/-/g, ''), 'hex')
    : undefined;
  const ethSig = new ETHSignature(
    Buffer.from(sigBytes),
    requestIdBuf,
    'GapSign',
  );
  return ethSig.toUREncoder(1000).nextPart();
}
