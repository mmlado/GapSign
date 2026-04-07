import {
  CryptoHDKey,
  CryptoKeypath,
  PathComponent,
} from '@keystonehq/bc-ur-registry';
import { UR, UREncoder } from '@ngraveio/bc-ur';

import {
  compressPubKey,
  derivationPathToKeypath,
  parseKeyFromTLV,
} from './hdKeyUtils';

const LEDGER_LEGACY_SOURCE = 'account.ledger_legacy';

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
  sourceFingerprint: number,
  source?: string,
): string {
  const { pubKeyUncompressed, chainCode } = parseKeyFromTLV(exportRespData);

  const hdKey = new CryptoHDKey({
    isMaster: false,
    key: compressPubKey(pubKeyUncompressed),
    chainCode: Buffer.from(chainCode),
    origin: derivationPathToKeypath(derivationPath, sourceFingerprint),
    name: 'GapSign',
    ...(source !== undefined && { note: source }),
    ...(source === LEDGER_LEGACY_SOURCE && {
      children: new CryptoKeypath([
        new PathComponent({ index: undefined, hardened: false }),
      ]),
    }),
  });

  const cbor = hdKey.toCBOR();
  const type = hdKey.getRegistryType().getType();
  return new UREncoder(
    new UR(cbor, type),
    Math.max(cbor.length, 100),
  ).nextPart();
}
