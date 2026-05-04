import { decodeSeedQr, isSeedQrPayload } from '../src/utils/seedQr';

const HEX_12 = '00000000000000000000000000000000'; // 16 bytes → 12 words
const HEX_24 =
  '0000000000000000000000000000000000000000000000000000000000000000'; // 32 bytes → 24 words

const WORDS_12 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const WORDS_24 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

describe('isSeedQrPayload', () => {
  it('accepts 16-byte hex', () => {
    expect(isSeedQrPayload(HEX_12)).toBe(true);
  });

  it('accepts 32-byte hex', () => {
    expect(isSeedQrPayload(HEX_24)).toBe(true);
  });

  it('accepts uppercase hex', () => {
    expect(isSeedQrPayload(HEX_12.toUpperCase())).toBe(true);
  });

  it('rejects non-hex string', () => {
    expect(isSeedQrPayload('notahex!!!')).toBe(false);
  });

  it('rejects wrong byte length', () => {
    expect(isSeedQrPayload('deadbeef')).toBe(false); // 4 bytes
  });
});

describe('decodeSeedQr', () => {
  it('decodes 12-word entropy correctly', () => {
    const result = decodeSeedQr(HEX_12);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.words.join(' ')).toBe(WORDS_12);
      expect(result.words).toHaveLength(12);
    }
  });

  it('decodes 24-word entropy correctly', () => {
    const result = decodeSeedQr(HEX_24);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.words.join(' ')).toBe(WORDS_24);
      expect(result.words).toHaveLength(24);
    }
  });

  it('accepts uppercase hex input', () => {
    const result = decodeSeedQr(HEX_12.toUpperCase());
    expect(result.kind).toBe('success');
  });

  it('returns error for non-hex input', () => {
    const result = decodeSeedQr('notahex!!!');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toMatch(/hex/i);
    }
  });

  it('returns error for wrong byte length', () => {
    const result = decodeSeedQr('deadbeef'); // 4 bytes
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toMatch(/got 4/);
    }
  });

  it('returns error when decoded mnemonic fails checksum', () => {
    const bip39 = require('@scure/bip39');
    jest.spyOn(bip39, 'validateMnemonic').mockReturnValueOnce(false);
    const result = decodeSeedQr(HEX_12);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toMatch(/checksum/);
    }
    jest.restoreAllMocks();
  });

  it('returns error when entropyToMnemonic throws', () => {
    const bip39 = require('@scure/bip39');
    jest.spyOn(bip39, 'entropyToMnemonic').mockImplementationOnce(() => {
      throw new Error('bad entropy');
    });
    const result = decodeSeedQr(HEX_12);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toMatch(/bad entropy/);
    }
    jest.restoreAllMocks();
  });
});
