import { parseEip712Prehashed, parseEip712Summary } from '../src/utils/eip712';

describe('parseEip712Summary', () => {
  it('parses utf8 JSON typed data into domain and message summaries', () => {
    const signDataHex = Buffer.from(
      JSON.stringify({
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
          ],
          Mail: [
            { name: 'from', type: 'address' },
            { name: 'contents', type: 'string' },
          ],
        },
        primaryType: 'Mail',
        domain: {
          name: 'Ether Mail',
          version: '1',
          chainId: 1,
          verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        },
        message: {
          from: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
          contents: 'Hello, Bob!',
          tags: ['test', 'mail'],
        },
      }),
      'utf8',
    ).toString('hex');

    expect(parseEip712Summary(signDataHex)).toEqual({
      rawJson: expect.stringContaining('"primaryType": "Mail"'),
      primaryType: 'Mail',
      domain: {
        chainId: '1',
        name: 'Ether Mail',
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        version: '1',
      },
      message: {
        contents: 'Hello, Bob!',
        from: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        tags: '["test","mail"]',
      },
    });
  });

  it('returns prettified JSON in rawJson regardless of input formatting', () => {
    const payload = {
      types: {
        EIP712Domain: [{ name: 'name', type: 'string' }],
        Message: [{ name: 'content', type: 'string' }],
      },
      primaryType: 'Message',
      domain: { name: 'Test' },
      message: { content: 'hello' },
    };
    const minified = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'hex',
    );
    const result = parseEip712Summary(minified);
    expect(result?.rawJson).toBe(JSON.stringify(payload, null, 2));
  });

  it('returns null for non-json data', () => {
    expect(parseEip712Summary('deadbeef')).toBeNull();
  });
});

describe('parseEip712Prehashed', () => {
  const DOMAIN_HASH = 'a'.repeat(64);
  const MESSAGE_HASH = 'b'.repeat(64);
  const PREHASHED_HEX = '1901' + DOMAIN_HASH + MESSAGE_HASH;

  it('parses a valid 0x1901-prefixed payload', () => {
    const result = parseEip712Prehashed(PREHASHED_HEX);
    expect(result).toEqual({
      domainSeparatorHash: '0x' + DOMAIN_HASH,
      messageHash: '0x' + MESSAGE_HASH,
    });
  });

  it('accepts 0x-prefixed input', () => {
    const result = parseEip712Prehashed('0x' + PREHASHED_HEX);
    expect(result).toEqual({
      domainSeparatorHash: '0x' + DOMAIN_HASH,
      messageHash: '0x' + MESSAGE_HASH,
    });
  });

  it('returns null for wrong prefix', () => {
    expect(
      parseEip712Prehashed('1900' + DOMAIN_HASH + MESSAGE_HASH),
    ).toBeNull();
  });

  it('returns null for wrong length', () => {
    expect(parseEip712Prehashed('1901' + DOMAIN_HASH)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseEip712Prehashed('')).toBeNull();
  });
});
