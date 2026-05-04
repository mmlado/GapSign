import { entropyToMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist as englishWordlist } from '@scure/bip39/wordlists/english.js';

export type SeedQrDecodeResult =
  | { kind: 'success'; words: string[] }
  | { kind: 'error'; message: string };

const VALID_ENTROPY_LENGTHS = [16, 32];

export function decodeSeedQr(payload: string): SeedQrDecodeResult {
  const cleaned = payload.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(cleaned)) {
    return { kind: 'error', message: 'SeedQR payload must be a hex string' };
  }

  const bytes = Buffer.from(cleaned, 'hex');
  if (!VALID_ENTROPY_LENGTHS.includes(bytes.length)) {
    return {
      kind: 'error',
      message: `Invalid SeedQR: expected 16 or 32 bytes, got ${bytes.length}`,
    };
  }

  try {
    const phrase = entropyToMnemonic(bytes, englishWordlist);
    if (!validateMnemonic(phrase, englishWordlist)) {
      return { kind: 'error', message: 'Decoded mnemonic failed checksum' };
    }
    return { kind: 'success', words: phrase.split(' ') };
  } catch (e: any) {
    return { kind: 'error', message: `Failed to decode SeedQR: ${e.message}` };
  }
}

export function isSeedQrPayload(value: string): boolean {
  const cleaned = value.trim().toLowerCase();
  return (
    /^[0-9a-f]+$/.test(cleaned) &&
    VALID_ENTROPY_LENGTHS.includes(cleaned.length / 2)
  );
}
