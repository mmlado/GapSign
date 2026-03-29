/* eslint-disable no-bitwise */
import { ripemd160 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  CryptoAccount,
  CryptoHDKey,
  CryptoKeypath,
  CryptoOutput,
  PathComponent,
  ScriptExpressions,
} from '@keystonehq/bc-ur-registry';

type ScriptType =
  | 'wpkh'
  | 'sh-wpkh'
  | 'pkh'
  | 'wsh'
  | 'sh-wsh'
  | 'sh';

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

const TLV_KEY_TEMPLATE = 0xA1;
const TLV_PUB_KEY = 0x80;
const TLV_CHAIN_CODE = 0x82;
const SCALAR_BYTES = 32;
const SINGLE_PART_UR_FRAGMENT_LENGTH = 1000;

function parseExportedExtendedKey(data: Uint8Array) {
  let position = 0;

  function readTag(): number {
    return data[position++];
  }

  function readLength(): number {
    let len = data[position++];
    if (len === 0x81) {
      len = data[position++];
    }
    return len;
  }

  function expectTag(tag: number) {
    const actual = readTag();
    if (actual !== tag) {
      throw new Error(
        `Expected tag 0x${tag.toString(16)}, got 0x${actual.toString(16)}`,
      );
    }
  }

  expectTag(TLV_KEY_TEMPLATE);
  const templateLen = readLength();
  const templateEnd = position + templateLen;

  expectTag(TLV_PUB_KEY);
  const pubKeyLen = readLength();
  const pubKey = data.slice(position, position + pubKeyLen);
  position += pubKeyLen;

  expectTag(TLV_CHAIN_CODE);
  const chainCodeLen = readLength();
  const chainCode = data.slice(position, position + chainCodeLen);
  position += chainCodeLen;

  if (position !== templateEnd) {
    throw new Error('Unexpected trailing data in exported key TLV');
  }

  return { pubKeyUncompressed: pubKey, chainCode };
}

function compressPubKey(uncompressed: Uint8Array): Buffer {
  const x = uncompressed.slice(1, 1 + SCALAR_BYTES);
  const y = uncompressed.slice(1 + SCALAR_BYTES);
  const prefix = (y[SCALAR_BYTES - 1] & 1) === 0 ? 0x02 : 0x03;
  return Buffer.concat([Buffer.from([prefix]), Buffer.from(x)]);
}

function numberToFingerprintBuffer(fingerprint: number): Buffer {
  return Buffer.from([
    (fingerprint >>> 24) & 0xff,
    (fingerprint >>> 16) & 0xff,
    (fingerprint >>> 8) & 0xff,
    fingerprint & 0xff,
  ]);
}

function derivationPathToKeypath(
  derivationPath: string,
  sourceFingerprint: number,
): CryptoKeypath {
  const components = derivationPath
    .split('/')
    .slice(1)
    .map(part => {
      const hardened = part.endsWith("'");
      const index = parseInt(hardened ? part.slice(0, -1) : part, 10);
      return new PathComponent({ index, hardened });
    });

  return new CryptoKeypath(
    components,
    numberToFingerprintBuffer(sourceFingerprint),
    components.length,
  );
}

function buildHdKey(
  descriptor: BitcoinAccountDescriptor,
  masterFingerprint: number,
): CryptoHDKey {
  const { pubKeyUncompressed, chainCode } = parseExportedExtendedKey(
    descriptor.exportRespData,
  );

  return new CryptoHDKey({
    isMaster: false,
    key: compressPubKey(pubKeyUncompressed),
    chainCode: Buffer.from(chainCode),
    origin: derivationPathToKeypath(descriptor.derivationPath, masterFingerprint),
    parentFingerprint: numberToFingerprintBuffer(descriptor.parentFingerprint),
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
      return new CryptoOutput([ScriptExpressions.WITNESS_PUBLIC_KEY_HASH], hdKey);
    case 'sh-wpkh':
      return new CryptoOutput(
        [ScriptExpressions.SCRIPT_HASH, ScriptExpressions.WITNESS_PUBLIC_KEY_HASH],
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
    (hash160[0] << 24) |
    (hash160[1] << 16) |
    (hash160[2] << 8) |
    hash160[3]
  ) >>> 0;
}

export function buildCryptoAccountUR(account: BitcoinCryptoAccount): string {
  const cryptoAccount = new CryptoAccount(
    numberToFingerprintBuffer(account.masterFingerprint),
    account.descriptors.map(descriptor =>
      buildOutputDescriptor(descriptor, account.masterFingerprint),
    ),
  );

  return cryptoAccount
    .toUREncoder(SINGLE_PART_UR_FRAGMENT_LENGTH)
    .nextPart();
}
