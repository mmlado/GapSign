import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RLP } from '@ethereumjs/rlp';

import EthSignRequestDetail from '../src/components/EthSignRequestDetail';
import type { EthSignRequest } from '../src/types';

jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return {
    MD3DarkTheme: { colors: {} },
    Text,
    Icon: () => null,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bn(n: bigint): Uint8Array {
  if (n === 0n) return new Uint8Array(0);
  const hex = n.toString(16);
  return Buffer.from(hex.length % 2 === 0 ? hex : '0' + hex, 'hex');
}

function addr(hex: string): Uint8Array {
  return Buffer.from(hex.replace('0x', ''), 'hex');
}

/** Legacy unsigned tx: RLP([nonce, gasPrice, gasLimit, to, value, data]) */
function legacyTxHex(value: bigint = 1_000_000_000_000_000_000n): string {
  return Buffer.from(
    RLP.encode([
      bn(1n),
      bn(20_000_000_000n),
      bn(21000n),
      addr('0xd3cda913deb6f4967b2ef3aa68f5a843da74c4ef'),
      bn(value),
      new Uint8Array(0),
    ]),
  ).toString('hex');
}

/** EIP-1559 tx: 0x02 || RLP([chainId, nonce, maxPFG, maxFG, gasLimit, to, value, data, []]) */
function eip1559TxHex(
  chainId: bigint,
  value: bigint = 50_000_000_000_000_000n,
): string {
  const rlp = Buffer.from(
    RLP.encode([
      bn(chainId),
      bn(1n),
      bn(1_000_000_000n),
      bn(10_000_000_000n),
      bn(21000n),
      addr('0xd3cda913deb6f4967b2ef3aa68f5a843da74c4ef'),
      bn(value),
      new Uint8Array(0),
      [],
    ]),
  );
  return Buffer.concat([Buffer.from([0x02]), rlp]).toString('hex');
}

/** EIP-2930 tx: 0x01 || RLP([chainId, nonce, gasPrice, gasLimit, to, value, data, []]) */
function eip2930TxHex(value: bigint = 500_000_000_000_000_000n): string {
  const rlp = Buffer.from(
    RLP.encode([
      bn(1n),
      bn(2n),
      bn(15_000_000_000n),
      bn(30000n),
      addr('0xd3cda913deb6f4967b2ef3aa68f5a843da74c4ef'),
      bn(value),
      new Uint8Array(0),
      [],
    ]),
  );
  return Buffer.concat([Buffer.from([0x01]), rlp]).toString('hex');
}

function renderDetail(request: EthSignRequest) {
  return render(<EthSignRequestDetail request={request} />);
}

// ---------------------------------------------------------------------------
// Chain name display
// ---------------------------------------------------------------------------

describe('EthSignRequestDetail — chain name', () => {
  it('shows chain name for BNB Smart Chain (56)', () => {
    renderDetail({
      signData: legacyTxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 56,
    });
    expect(screen.getByText('BNB Smart Chain Mainnet')).toBeTruthy();
  });

  it('shows chain name for Polygon (137)', () => {
    renderDetail({
      signData: legacyTxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 137,
    });
    expect(screen.getByText('Polygon Mainnet')).toBeTruthy();
  });

  it('shows chain name for Base (8453)', () => {
    renderDetail({
      signData: legacyTxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 8453,
    });
    expect(screen.getByText('Base')).toBeTruthy();
  });

  it('falls back to "Chain N" for unknown chain', () => {
    renderDetail({
      signData: legacyTxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 0xdeadbeef,
    });
    expect(screen.getByText('Chain 3735928559')).toBeTruthy();
  });

  it('omits chain row when chainId is undefined', () => {
    renderDetail({
      signData: legacyTxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
    });
    expect(screen.queryByText('Chain')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Native currency symbol in amount
// ---------------------------------------------------------------------------

describe('EthSignRequestDetail — native currency symbol', () => {
  it('shows ETH symbol for Ethereum Mainnet (chainId=1)', () => {
    renderDetail({
      signData: legacyTxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 1,
    });
    expect(screen.getByText(/ETH/)).toBeTruthy();
  });

  it('shows BNB symbol for BNB Smart Chain (chainId=56)', () => {
    renderDetail({
      signData: legacyTxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 56,
    });
    // "1 BNB" is the formatted native amount; distinct from the chain name "BNB Smart Chain Mainnet"
    expect(screen.getByText('1 BNB')).toBeTruthy();
  });

  it('shows POL symbol for Polygon Mainnet (chainId=137)', () => {
    renderDetail({
      signData: eip1559TxHex(137n),
      dataType: 4,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 137,
    });
    expect(screen.getByText(/POL/)).toBeTruthy();
  });

  it('shows correct symbol for EIP-2930 tx on chainId=1', () => {
    renderDetail({
      signData: eip2930TxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 1,
    });
    expect(screen.getByText(/ETH/)).toBeTruthy();
  });

  it('defaults to ETH symbol when chainId is undefined', () => {
    renderDetail({
      signData: legacyTxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
    });
    expect(screen.getByText(/ETH/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Transaction type labels
// ---------------------------------------------------------------------------

describe('EthSignRequestDetail — transaction type labels', () => {
  it('shows "EIP-1559 Transaction" label for dataType=4', () => {
    renderDetail({
      signData: eip1559TxHex(1n),
      dataType: 4,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 1,
    });
    expect(screen.getByText('EIP-1559 Transaction')).toBeTruthy();
  });

  it('shows "EIP-2930 Transaction" label for 0x01-prefixed dataType=1', () => {
    renderDetail({
      signData: eip2930TxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 1,
    });
    expect(screen.getByText('EIP-2930 Transaction')).toBeTruthy();
  });

  it('shows max fee and priority fee for EIP-1559 tx', () => {
    renderDetail({
      signData: eip1559TxHex(1n),
      dataType: 4,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 1,
    });
    expect(screen.getByText('Max fee')).toBeTruthy();
    expect(screen.getByText('Priority fee')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Zero value + decoded ERC-20 call hides native amount row
// ---------------------------------------------------------------------------

describe('EthSignRequestDetail — amount row visibility', () => {
  // ERC-20 transfer calldata for transfer(address, uint256)
  const ERC20_TRANSFER =
    'a9059cbb' +
    '000000000000000000000000d3cda913deb6f4967b2ef3aa68f5a843da74c4ef' +
    '0000000000000000000000000000000000000000000000000de0b6b3a7640000';

  function erc20TxHex(): string {
    const data = Buffer.from(ERC20_TRANSFER, 'hex');
    return Buffer.from(
      RLP.encode([
        bn(1n),
        bn(20_000_000_000n),
        bn(60000n),
        addr('0xdac17f958d2ee523a2206206994597c13d831ec7'),
        bn(0n), // zero ETH value
        data,
      ]),
    ).toString('hex');
  }

  it('hides native amount when value is zero and decoded ERC-20 call present', () => {
    renderDetail({
      signData: erc20TxHex(),
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 1,
    });
    // DecodedCallSection renders, native amount row does not
    expect(screen.getByText('ERC-20 Transfer')).toBeTruthy();
    // No formatted native value (e.g. "1 ETH") — zero-value native row is suppressed
    expect(screen.queryByText(/\d.*ETH/)).toBeNull();
  });

  it('shows native amount when value is non-zero even with decoded call', () => {
    // 0.001 ETH + ERC-20 calldata (unusual but valid)
    const data = Buffer.from(ERC20_TRANSFER, 'hex');
    const txHex = Buffer.from(
      RLP.encode([
        bn(1n),
        bn(20_000_000_000n),
        bn(60000n),
        addr('0xdac17f958d2ee523a2206206994597c13d831ec7'),
        bn(1_000_000_000_000_000n), // 0.001 ETH
        data,
      ]),
    ).toString('hex');
    renderDetail({
      signData: txHex,
      dataType: 1,
      derivationPath: "m/44'/60'/0'/0",
      chainId: 1,
    });
    expect(screen.getByText('0.001 ETH')).toBeTruthy();
  });
});
