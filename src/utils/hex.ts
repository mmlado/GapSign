export type HexString = `0x${string}`;

export function ensureHexPrefix(value: string): HexString {
  return (value.startsWith('0x') ? value : `0x${value}`) as HexString;
}

export function toHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
