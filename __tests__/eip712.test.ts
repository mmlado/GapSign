import { parseEip712Summary } from '../src/utils/eip712';

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
      rawJson: expect.stringContaining('"primaryType":"Mail"'),
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

  it('returns null for non-json data', () => {
    expect(parseEip712Summary('deadbeef')).toBeNull();
  });
});
