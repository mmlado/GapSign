import { hexToString, stringToHex, validateTypedData } from 'viem';

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

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeUtf8(hex: string): string | null {
  try {
    const normalizedHex = hex.startsWith('0x') ? hex : `0x${hex}`;
    const text = hexToString(normalizedHex);
    if (stringToHex(text).toLowerCase() !== normalizedHex.toLowerCase()) {
      return null;
    }
    return text;
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
      rawJson: json,
      primaryType:
        typeof parsed.primaryType === 'string' ? parsed.primaryType : undefined,
      domain: toDisplayMap(parsed.domain),
      message: toDisplayMap(parsed.message),
    };
  } catch {
    return null;
  }
}
