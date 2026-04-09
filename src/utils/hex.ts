export type HexString = `0x${string}`;

export function ensureHexPrefix(value: string): HexString {
  return (value.startsWith('0x') ? value : `0x${value}`) as HexString;
}
