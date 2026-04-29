import {
  getChainName,
  getNativeCurrencySymbol,
} from '../src/utils/chainMetadata';

describe('getChainName', () => {
  it('returns name for known chain', () => {
    expect(getChainName(1)).toBe('Ethereum Mainnet');
  });

  it('returns name for other known chains', () => {
    expect(getChainName(56)).toBe('BNB Smart Chain Mainnet');
    expect(getChainName(137)).toBe('Polygon Mainnet');
    expect(getChainName(8453)).toBe('Base');
    expect(getChainName(42161)).toBe('Arbitrum One');
  });

  it('falls back to Chain <id> for unknown chain', () => {
    expect(getChainName(0xdeadbeef)).toBe('Chain 3735928559');
  });
});

describe('getNativeCurrencySymbol', () => {
  it('returns ETH for Ethereum Mainnet', () => {
    expect(getNativeCurrencySymbol(1)).toBe('ETH');
  });

  it('returns correct symbol for non-ETH chains', () => {
    expect(getNativeCurrencySymbol(56)).toBe('BNB');
    expect(getNativeCurrencySymbol(137)).toBe('POL');
  });

  it('falls back to ETH for unknown chain', () => {
    expect(getNativeCurrencySymbol(0xdeadbeef)).toBe('ETH');
  });
});
