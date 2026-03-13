/* eslint-disable no-bitwise */
import Keycard from 'keycard-sdk';
import { HDKey } from '@scure/bip32';

const TLV_KEY_TEMPLATE = 0xa1;
const TLV_PUB_KEY = 0x80;
const TLV_CHAIN_CODE = 0x82;
const SCALAR_BYTES = 32;

export function parseExtendedKeyFromTLV(data: Uint8Array): HDKey {
  const tlv = new Keycard.BERTLV(data);
  tlv.enterConstructed(TLV_KEY_TEMPLATE);
  const pubKeyUncompressed = tlv.readPrimitive(TLV_PUB_KEY);
  const chainCode = tlv.readPrimitive(TLV_CHAIN_CODE);

  const x = pubKeyUncompressed.slice(1, 1 + SCALAR_BYTES);
  const yLast = pubKeyUncompressed[1 + 2 * SCALAR_BYTES - 1];
  const prefix = (yLast & 1) === 0 ? 0x02 : 0x03;
  const compressed = new Uint8Array(33);
  compressed[0] = prefix;
  compressed.set(x, 1);

  return new HDKey({ publicKey: compressed, chainCode });
}

// Derive `count` child public keys at path .../0/0, .../0/1, ...
// addrFn converts a compressed pubkey to a coin-specific address string.
export function deriveAddresses(
  externalKey: HDKey, // already the /0 child
  count: number,
  addrFn: (pubKey: Uint8Array) => string,
  startIndex = 0,
): string[] {
  return Array.from({ length: count }, (_, i) =>
    addrFn(externalKey.deriveChild(startIndex + i).publicKey!),
  );
}
