/* eslint-disable no-bitwise */
import { keccak_256 } from '@noble/hashes/sha3.js';
import Keycard from 'keycard-sdk';
import type { Commandset } from 'keycard-sdk/dist/commandset';

import {
  buildCryptoAccountUR,
  pubKeyFingerprint,
  type BitcoinCryptoAccount,
} from './cryptoAccount';
import { buildCryptoHdKeyUR } from './cryptoHdKey';
import {
  buildCryptoMultiAccountsUR,
  exportKeysForBitget,
  type BitgetExportResult,
} from './cryptoMultiAccounts';

export type ExportKeyResult =
  | Uint8Array
  | BitcoinCryptoAccount
  | BitgetExportResult;

type BitcoinDescriptorPlan = {
  derivationPath: string;
  parentPath: string;
  scriptType: BitcoinCryptoAccount['descriptors'][number]['scriptType'];
};

const TLV_KEY_TEMPLATE = 0xa1;
const TLV_PUB_KEY = 0x80;

export function prepareSignHash(
  signData: string,
  dataType: number | undefined,
): Uint8Array {
  const raw = new Uint8Array(Buffer.from(signData, 'hex'));
  if (dataType === 1 || dataType === 4) {
    return keccak_256(raw);
  }
  return raw;
}

export function buildExportUr(
  result: ExportKeyResult,
  derivationPath: string,
): string {
  if (result instanceof Uint8Array) {
    return buildCryptoHdKeyUR(result, derivationPath);
  }
  if ('keys' in result) {
    return buildCryptoMultiAccountsUR(result);
  }
  return buildCryptoAccountUR(result);
}

export async function exportKeyForWallet(
  cmdSet: Commandset,
  derivationPath: string,
  setStatus: (s: string) => void = () => {},
): Promise<ExportKeyResult> {
  if (derivationPath === 'bitget') {
    return exportKeysForBitget(cmdSet, setStatus);
  }

  if (!isBitcoinPath(derivationPath)) {
    const resp = await cmdSet.exportExtendedKey(0, derivationPath, false);
    resp.checkOK();
    return resp.data;
  }

  const rootResp = await cmdSet.exportKey(0, true, 'm', false);
  rootResp.checkOK();
  const masterFingerprint = pubKeyFingerprint(
    parsePublicKeyFromTLV(rootResp.data),
  );

  const descriptors: BitcoinCryptoAccount['descriptors'] = [];
  for (const descriptor of bitcoinDescriptorPlan(derivationPath)) {
    const keyResp = await cmdSet.exportExtendedKey(
      0,
      descriptor.derivationPath,
      false,
    );
    keyResp.checkOK();

    const parentResp = await cmdSet.exportKey(
      0,
      true,
      descriptor.parentPath,
      false,
    );
    parentResp.checkOK();

    descriptors.push({
      derivationPath: descriptor.derivationPath,
      exportRespData: keyResp.data,
      parentFingerprint: pubKeyFingerprint(
        parsePublicKeyFromTLV(parentResp.data),
      ),
      scriptType: descriptor.scriptType,
    });
  }

  return {
    masterFingerprint,
    descriptors,
  };
}

function isBitcoinMultisigPath(path: string) {
  return /^m\/48'\/0'\/\d+'\/2'$/.test(path);
}

function isBitcoinPath(path: string) {
  return /^m\/(44'|49'|84'|48')\/(0'|1')\//.test(path);
}

function parsePath(path: string): number[] {
  const parts = path.split('/').slice(1);
  return parts.map(part => {
    const hardened = part.endsWith("'");
    const value = parseInt(hardened ? part.slice(0, -1) : part, 10);
    return hardened ? value | 0x80000000 : value;
  });
}

function formatPath(parts: number[]): string {
  return (
    'm/' +
    parts
      .map(part => {
        const hardened = (part & 0x80000000) !== 0;
        const value = part & 0x7fffffff;
        return `${value}${hardened ? "'" : ''}`;
      })
      .join('/')
  );
}

function bitcoinDescriptorPlan(path: string): BitcoinDescriptorPlan[] {
  const parts = parsePath(path);

  if (isBitcoinMultisigPath(path)) {
    const [purpose, coin, account] = parts;
    return [
      {
        derivationPath: formatPath([purpose, coin, account, 0x80000002]),
        parentPath: formatPath([purpose, coin, account]),
        scriptType: 'wsh',
      },
      {
        derivationPath: formatPath([purpose, coin, account, 0x80000001]),
        parentPath: formatPath([purpose, coin, account]),
        scriptType: 'sh-wsh',
      },
      {
        derivationPath: "m/45'",
        parentPath: 'm',
        scriptType: 'sh',
      },
    ];
  }

  const [, coin, account] = parts;
  return [
    {
      derivationPath: formatPath([0x80000054, coin, account]),
      parentPath: formatPath([0x80000054, coin]),
      scriptType: 'wpkh',
    },
    {
      derivationPath: formatPath([0x80000031, coin, account]),
      parentPath: formatPath([0x80000031, coin]),
      scriptType: 'sh-wpkh',
    },
    {
      derivationPath: formatPath([0x8000002c, coin, account]),
      parentPath: formatPath([0x8000002c, coin]),
      scriptType: 'pkh',
    },
  ];
}

function parsePublicKeyFromTLV(data: Uint8Array): Uint8Array {
  const tlv = new Keycard.BERTLV(data);
  tlv.enterConstructed(TLV_KEY_TEMPLATE);
  return tlv.readPrimitive(TLV_PUB_KEY);
}
