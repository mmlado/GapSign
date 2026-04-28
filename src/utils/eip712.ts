import { validateTypedData } from 'viem';

import { ensureHexPrefix } from './hex';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonObject = { [key: string]: JsonValue };

export type Eip712Summary = {
  rawJson: string;
  primaryType?: string;
  domain: Record<string, string>;
  message: Record<string, string>;
};

export type Eip712Prehashed = {
  domainSeparatorHash: string;
  messageHash: string;
};

// \x19\x01 prefix + 32-byte domain separator + 32-byte message hash = 66 bytes
const PREHASHED_PREFIX = '1901';
const PREHASHED_BYTE_LENGTH = 66;

export function parseEip712Prehashed(
  signDataHex: string,
): Eip712Prehashed | null {
  const hex = signDataHex.replace(/^0x/, '');
  if (hex.length !== PREHASHED_BYTE_LENGTH * 2) return null;
  if (!hex.startsWith(PREHASHED_PREFIX)) return null;
  return {
    domainSeparatorHash: '0x' + hex.slice(4, 68),
    messageHash: '0x' + hex.slice(68),
  };
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeUtf8(hex: string): string | null {
  try {
    const stripped = ensureHexPrefix(hex).replace(/^0x/, '');
    return Buffer.from(stripped, 'hex').toString('utf8');
  } catch {
    return null;
  }
}

function stringifyValue(value: JsonValue): string {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  return JSON.stringify(value);
}

function toDisplayMap(value: unknown): Record<string, string> {
  if (!isJsonObject(value)) {
    return {};
  }

  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = stringifyValue(value[key]);
      return acc;
    }, {});
}

export function parseEip712Summary(signDataHex: string): Eip712Summary | null {
  const json = decodeUtf8(signDataHex);
  if (!json) {
    return null;
  }

  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isJsonObject(parsed)) {
      return null;
    }

    validateTypedData({
      domain: isJsonObject(parsed.domain) ? parsed.domain : {},
      message: isJsonObject(parsed.message) ? parsed.message : {},
      primaryType:
        typeof parsed.primaryType === 'string'
          ? parsed.primaryType
          : 'EIP712Domain',
      types: isJsonObject(parsed.types) ? parsed.types : {},
    });

    return {
      rawJson: JSON.stringify(parsed, null, 2),
      primaryType:
        typeof parsed.primaryType === 'string' ? parsed.primaryType : undefined,
      domain: toDisplayMap(parsed.domain),
      message: toDisplayMap(parsed.message),
    };
  } catch {
    return null;
  }
}
