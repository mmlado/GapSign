import Keycard from 'keycard-sdk';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import {
  CryptoHDKey,
  CryptoKeypath,
  PathComponent,
} from '@keystonehq/bc-ur-registry';

const TLV_KEY_TEMPLATE = 0xa1;
const TLV_PUB_KEY = 0x80;
const TLV_CHAIN_CODE = 0x82;
const SCALAR_BYTES = 32;

function compressPubKey(uncompressed: Uint8Array): Buffer {
  const x = uncompressed.slice(1, 1 + SCALAR_BYTES);
  const y = uncompressed.slice(1 + SCALAR_BYTES);
  const prefix = (y[SCALAR_BYTES - 1] & 1) === 0 ? 0x02 : 0x03;
  return Buffer.concat([Buffer.from([prefix]), Buffer.from(x)]);
}

function derivationPathToKeypath(derivationPath: string): CryptoKeypath {
  const components = derivationPath
    .split('/')
    .slice(1)
    .map(part => {
      const hardened = part.endsWith("'");
      const index = parseInt(hardened ? part.slice(0, -1) : part, 10);
      return new PathComponent({ index, hardened });
    });

  return new CryptoKeypath(components, undefined, components.length);
}

/**
 * Parse the raw Keycard exportKey TLV response, encode it as a
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

  const hdKey = new CryptoHDKey({
    isMaster: false,
    key: compressPubKey(pubKeyUncompressed),
    chainCode: Buffer.from(chainCode),
    origin: derivationPathToKeypath(derivationPath),
    name: 'GapSign',
  });

  const cbor = hdKey.toCBOR();
  const type = hdKey.getRegistryType().getType();
  return new UREncoder(
    new UR(cbor, type),
    Math.max(cbor.length, 100),
  ).nextPart();
}
