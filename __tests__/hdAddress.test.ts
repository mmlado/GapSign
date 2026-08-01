import { addressDerivationPath, deriveAddresses } from '../src/utils/hdAddress';

// ---------------------------------------------------------------------------
// Tests: deriveAddresses
// ---------------------------------------------------------------------------

describe('deriveAddresses', () => {
  const makeExternalKey = () => ({
    deriveChild: jest.fn((i: number) => ({ publicKey: new Uint8Array([i]) })),
  });

  it('returns the requested number of addresses', () => {
    const key = makeExternalKey();
    const addrFn = jest.fn(() => 'addr');
    const result = deriveAddresses(key as any, 5, addrFn);
    expect(result).toHaveLength(5);
  });

  it('calls addrFn with the derived child public key', () => {
    const key = makeExternalKey();
    const addrFn = jest.fn((pub: Uint8Array) => `addr-${pub[0]}`);
    const result = deriveAddresses(key as any, 3, addrFn);
    expect(result).toEqual(['addr-0', 'addr-1', 'addr-2']);
  });

  it('respects the startIndex parameter', () => {
    const key = makeExternalKey();
    const addrFn = jest.fn((pub: Uint8Array) => `addr-${pub[0]}`);
    const result = deriveAddresses(key as any, 2, addrFn, 10);
    expect(result).toEqual(['addr-10', 'addr-11']);
  });
});

// ---------------------------------------------------------------------------
// Tests: addressDerivationPath
// ---------------------------------------------------------------------------

describe('addressDerivationPath', () => {
  it('builds the full ETH path from the account path and index', () => {
    expect(addressDerivationPath('eth', 0)).toBe("m/44'/60'/0'/0/0");
    expect(addressDerivationPath('eth', 7)).toBe("m/44'/60'/0'/0/7");
  });

  it('builds the full BTC path from the account path and index', () => {
    expect(addressDerivationPath('btc', 0)).toBe("m/84'/0'/0'/0/0");
    expect(addressDerivationPath('btc', 21)).toBe("m/84'/0'/0'/0/21");
  });
});
