/* eslint-disable no-bitwise */
import {
  CryptoAccount,
  CryptoCoinInfo,
  CryptoCoinInfoNetwork,
  CryptoCoinInfoType,
  CryptoHDKey,
  CryptoOutput,
  ScriptExpressions,
} from '@keystonehq/bc-ur-registry';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';

import {
  coinTypeFromPath,
  compressPubKey,
  derivationPathToKeypath,
  numberToFingerprintBuffer,
  parseExtendedKeyFromTLV,
} from './hdKeyUtils';

type ScriptType = 'wpkh' | 'sh-wpkh' | 'pkh' | 'wsh' | 'sh-wsh' | 'sh';

export type BitcoinAccountDescriptor = {
  derivationPath: string;
  exportRespData: Uint8Array;
  parentFingerprint: number;
  scriptType: ScriptType;
};

export type BitcoinCryptoAccount = {
  masterFingerprint: number;
  descriptors: BitcoinAccountDescriptor[];
};

function buildHdKey(
  descriptor: BitcoinAccountDescriptor,
  masterFingerprint: number,
): CryptoHDKey {
  const { pubKeyUncompressed, chainCode } = parseExtendedKeyFromTLV(
    descriptor.exportRespData,
  );

  const coinType = coinTypeFromPath(descriptor.derivationPath);
  const network =
    coinType === 1
      ? CryptoCoinInfoNetwork.testnet
      : CryptoCoinInfoNetwork.mainnet;

  return new CryptoHDKey({
    isMaster: false,
    key: compressPubKey(pubKeyUncompressed),
    chainCode: Buffer.from(chainCode),
    origin: derivationPathToKeypath(
      descriptor.derivationPath,
      masterFingerprint,
    ),
    parentFingerprint: numberToFingerprintBuffer(descriptor.parentFingerprint),
    useInfo: new CryptoCoinInfo(CryptoCoinInfoType.bitcoin, network),
    name: 'GapSign',
  });
}

function buildOutputDescriptor(
  descriptor: BitcoinAccountDescriptor,
  masterFingerprint: number,
): CryptoOutput {
  const hdKey = buildHdKey(descriptor, masterFingerprint);

  switch (descriptor.scriptType) {
    case 'wpkh':
      return new CryptoOutput(
        [ScriptExpressions.WITNESS_PUBLIC_KEY_HASH],
        hdKey,
      );
    case 'sh-wpkh':
      return new CryptoOutput(
        [
          ScriptExpressions.SCRIPT_HASH,
          ScriptExpressions.WITNESS_PUBLIC_KEY_HASH,
        ],
        hdKey,
      );
    case 'pkh':
      return new CryptoOutput([ScriptExpressions.PUBLIC_KEY_HASH], hdKey);
    case 'wsh':
      return new CryptoOutput([ScriptExpressions.WITNESS_SCRIPT_HASH], hdKey);
    case 'sh-wsh':
      return new CryptoOutput(
        [ScriptExpressions.SCRIPT_HASH, ScriptExpressions.WITNESS_SCRIPT_HASH],
        hdKey,
      );
    case 'sh':
      return new CryptoOutput([ScriptExpressions.SCRIPT_HASH], hdKey);
  }
}

export function pubKeyFingerprint(uncompressedPubKey: Uint8Array): number {
  const compressed = compressPubKey(uncompressedPubKey);
  const hash160 = ripemd160(sha256(compressed));
  return (
    ((hash160[0] << 24) |
      (hash160[1] << 16) |
      (hash160[2] << 8) |
      hash160[3]) >>>
    0
  );
}

export function buildCryptoAccountUR(account: BitcoinCryptoAccount): string {
  const cryptoAccount = new CryptoAccount(
    numberToFingerprintBuffer(account.masterFingerprint),
    account.descriptors.map(descriptor =>
      buildOutputDescriptor(descriptor, account.masterFingerprint),
    ),
  );

  const cbor = cryptoAccount.toCBOR();
  const type = cryptoAccount.getRegistryType().getType();
  return new UREncoder(
    new UR(cbor, type),
    Math.max(cbor.length, 100),
  ).nextPart();
}
