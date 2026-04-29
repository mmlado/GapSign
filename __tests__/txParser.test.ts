import { RLP } from '@ethereumjs/rlp';

import { decodeCalldata, getTxLabel, parseTx } from '../src/utils/txParser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ''), 'hex');
}

function bigIntToMinBytes(n: bigint): Uint8Array {
  if (n === 0n) return new Uint8Array(0);
  const hex = n.toString(16).padStart(2, '0');
  const padded = hex.length % 2 === 0 ? hex : '0' + hex;
  return Buffer.from(padded, 'hex');
}

/** Build a legacy unsigned tx: RLP([nonce, gasPrice, gasLimit, to, value, data]) */
function buildLegacyTxHex({
  nonce = 1n,
  gasPrice = 20_000_000_000n, // 20 Gwei
  gasLimit = 21000n,
  to = '0xd3cda913deb6f4967b2ef3aa68f5a843da74c4ef',
  value = 1_000_000_000_000_000_000n, // 1 ETH
  data = new Uint8Array(0),
} = {}): string {
  const encoded = RLP.encode([
    bigIntToMinBytes(nonce),
    bigIntToMinBytes(gasPrice),
    bigIntToMinBytes(gasLimit),
    hexToBytes(to),
    bigIntToMinBytes(value),
    data,
  ]);
  return Buffer.from(encoded).toString('hex');
}

/** Build an EIP-2930 tx: 0x01 || RLP([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList]) */
function buildEIP2930TxHex({
  chainId = 1n,
  nonce = 2n,
  gasPrice = 15_000_000_000n, // 15 Gwei
  gasLimit = 30000n,
  to = '0xd3cda913deb6f4967b2ef3aa68f5a843da74c4ef',
  value = 500_000_000_000_000_000n, // 0.5 ETH
  data = new Uint8Array(0),
  accessList = [],
} = {}): string {
  const rlp = RLP.encode([
    bigIntToMinBytes(chainId),
    bigIntToMinBytes(nonce),
    bigIntToMinBytes(gasPrice),
    bigIntToMinBytes(gasLimit),
    hexToBytes(to),
    bigIntToMinBytes(value),
    data,
    accessList,
  ]);
  const bytes = new Uint8Array(1 + rlp.length);
  bytes[0] = 0x01;
  bytes.set(rlp, 1);
  return Buffer.from(bytes).toString('hex');
}

function buildEIP1559TxHex({
  chainId = 1n,
  nonce = 0n,
  maxPriorityFeePerGas = 1_000_000_000n,
  maxFeePerGas = 20_000_000_000n,
  gasLimit = 21000n,
  to = '0x0000000000000000000000000000000000000001',
  value = 1n,
  data = new Uint8Array(0),
  accessList = [],
} = {}): string {
  const rlp = RLP.encode([
    bigIntToMinBytes(chainId),
    bigIntToMinBytes(nonce),
    bigIntToMinBytes(maxPriorityFeePerGas),
    bigIntToMinBytes(maxFeePerGas),
    bigIntToMinBytes(gasLimit),
    hexToBytes(to),
    bigIntToMinBytes(value),
    data,
    accessList,
  ]);
  const bytes = new Uint8Array(1 + rlp.length);
  bytes[0] = 0x02;
  bytes.set(rlp, 1);
  return Buffer.from(bytes).toString('hex');
}

// ---------------------------------------------------------------------------
// parseTx
// ---------------------------------------------------------------------------

describe('parseTx', () => {
  describe('legacy (dataType=1, no type prefix)', () => {
    it('parses to address', () => {
      const hex = buildLegacyTxHex();
      const tx = parseTx(hex, 1);
      expect(tx?.to?.toLowerCase()).toBe(
        '0xd3cda913deb6f4967b2ef3aa68f5a843da74c4ef',
      );
    });

    it('parses value as ETH string', () => {
      const hex = buildLegacyTxHex();
      const tx = parseTx(hex, 1);
      expect(tx?.value).toBe('1 ETH');
    });

    it('parses fees as legacy kind', () => {
      const hex = buildLegacyTxHex();
      const tx = parseTx(hex, 1);
      expect(tx?.fees.kind).toBe('legacy');
      if (tx?.fees.kind === 'legacy') {
        expect(tx.fees.gasPrice).toMatch(/Gwei/);
        expect(tx.fees.gasLimit).toBe('21000');
      }
    });
  });

  describe('EIP-2930 (dataType=1, 0x01 prefix)', () => {
    it('parses to address', () => {
      const hex = buildEIP2930TxHex();
      const tx = parseTx(hex, 1);
      expect(tx?.to?.toLowerCase()).toBe(
        '0xd3cda913deb6f4967b2ef3aa68f5a843da74c4ef',
      );
    });

    it('parses value as ETH string', () => {
      const hex = buildEIP2930TxHex();
      const tx = parseTx(hex, 1);
      expect(tx?.value).toMatch(/ETH/);
    });

    it('parses fees as legacy kind (gasPrice)', () => {
      const hex = buildEIP2930TxHex();
      const tx = parseTx(hex, 1);
      expect(tx?.fees.kind).toBe('legacy');
      if (tx?.fees.kind === 'legacy') {
        expect(tx.fees.gasPrice).toMatch(/Gwei/);
        expect(tx.fees.gasLimit).toBe('30000');
      }
    });

    it('parses nonce correctly', () => {
      const hex = buildEIP2930TxHex({ nonce: 7n });
      const tx = parseTx(hex, 1);
      expect(tx?.nonce).toBe(7);
    });
  });

  describe('EIP-1559 (dataType=4, 0x02 prefix)', () => {
    it('parses a valid type-2 transaction with an empty access list', () => {
      const tx = parseTx(buildEIP1559TxHex(), 4);
      expect(tx?.to).toBe('0x0000000000000000000000000000000000000001');
      expect(tx?.value).toBe('1 wei');
      expect(tx?.data).toBeUndefined();
      expect(tx?.fees.kind).toBe('eip1559');
      if (tx?.fees.kind === 'eip1559') {
        expect(tx.fees.gasLimit).toBe('21000');
      }
    });

    it('rejects a type-2 transaction whose access list is encoded as bytes', () => {
      const shiftedFieldsFromQrkitDemo =
        '02e80180843b9aca008504a817c800825208940000000000000000000000000000000000000000010180c0';
      expect(parseTx(shiftedFieldsFromQrkitDemo, 4)).toBeNull();
    });
  });

  it('returns null for non-transaction dataType (EIP-712)', () => {
    expect(parseTx('deadbeef', 2)).toBeNull();
  });

  it('returns null for malformed hex', () => {
    expect(parseTx('zzzz', 1)).toBeNull();
  });

  describe('nativeCurrencySymbol param', () => {
    it('uses custom symbol in value for legacy tx', () => {
      const hex = buildLegacyTxHex({ value: 1_000_000_000_000_000_000n });
      const tx = parseTx(hex, 1, 'BNB');
      expect(tx?.value).toBe('1 BNB');
    });

    it('uses custom symbol in value for EIP-1559 tx', () => {
      const hex = buildEIP1559TxHex({ value: 1_000_000_000_000_000_000n });
      const tx = parseTx(hex, 4, 'POL');
      expect(tx?.value).toBe('1 POL');
    });

    it('uses custom symbol in value for EIP-2930 tx', () => {
      const hex = buildEIP2930TxHex({ value: 1_000_000_000_000_000_000n });
      const tx = parseTx(hex, 1, 'AVAX');
      expect(tx?.value).toBe('1 AVAX');
    });
  });
});

// ---------------------------------------------------------------------------
// getTxLabel
// ---------------------------------------------------------------------------

describe('getTxLabel', () => {
  it('returns "EIP-2930 Transaction" for 0x01-prefixed dataType=1', () => {
    expect(getTxLabel(buildEIP2930TxHex(), 1)).toBe('EIP-2930 Transaction');
  });

  it('returns "Legacy Transaction" for plain dataType=1', () => {
    expect(getTxLabel(buildLegacyTxHex(), 1)).toBe('Legacy Transaction');
  });

  it('returns "EIP-1559 Transaction" for dataType=4', () => {
    expect(getTxLabel('02' + 'deadbeef', 4)).toBe('EIP-1559 Transaction');
  });

  it('returns "EIP-712 Typed Data" for dataType=2', () => {
    expect(getTxLabel('deadbeef', 2)).toBe('EIP-712 Typed Data');
  });

  it('returns "Personal Message" for dataType=3', () => {
    expect(getTxLabel('deadbeef', 3)).toBe('Personal Message');
  });

  it('returns fallback for unknown dataType', () => {
    expect(getTxLabel('deadbeef', 99)).toBe('Unknown (99)');
  });
});

// ---------------------------------------------------------------------------
// decodeCalldata
// ---------------------------------------------------------------------------

describe('decodeCalldata', () => {
  const RECIPIENT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  const SPENDER = '0x1111111111111111111111111111111111111111';
  const FROM = '0x2222222222222222222222222222222222222222';

  const TRANSFER_HEX =
    '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa9604500000000000000000000000000000000000000000000000000000000000f4240';
  const APPROVE_UNLIMITED_HEX =
    '0x095ea7b30000000000000000000000001111111111111111111111111111111111111111ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  const TRANSFER_FROM_HEX =
    '0x23b872dd0000000000000000000000002222222222222222222222222222222222222222000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa9604500000000000000000000000000000000000000000000000000000000000001f4';

  it('decodes ERC-20 transfer', () => {
    const result = decodeCalldata(TRANSFER_HEX);
    expect(result).toEqual({
      kind: 'erc20-transfer',
      to: RECIPIENT,
      amount: 1000000n,
    });
  });

  it('decodes ERC-20 transferFrom', () => {
    const result = decodeCalldata(TRANSFER_FROM_HEX);
    expect(result).toEqual({
      kind: 'erc20-transferFrom',
      from: FROM,
      to: RECIPIENT,
      amount: 500n,
    });
  });

  it('decodes ERC-20 approve with unlimited allowance', () => {
    const result = decodeCalldata(APPROVE_UNLIMITED_HEX);
    expect(result).toEqual({
      kind: 'erc20-approve',
      spender: SPENDER,
      amount: 2n ** 256n - 1n,
    });
  });

  it('returns unknown-call with raw selector for unrecognised calldata', () => {
    const result = decodeCalldata('0xdeadbeef' + '00'.repeat(32));
    expect(result).toEqual({ kind: 'unknown-call', selector: '0xdeadbeef' });
  });

  it('returns null for empty calldata', () => {
    expect(decodeCalldata('0x')).toBeNull();
    expect(decodeCalldata('')).toBeNull();
  });

  it('parseTx includes decodedCall for ERC-20 transfer in legacy tx', () => {
    // Build a legacy tx with ERC-20 transfer calldata
    const toContract = Buffer.from(
      'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'hex',
    );
    const calldata = Buffer.from(TRANSFER_HEX.replace('0x', ''), 'hex');
    const encoded = RLP.encode([
      Buffer.from([0x01]), // nonce
      Buffer.from([0x09, 0xc4]), // gasPrice
      Buffer.from([0x52, 0x08]), // gasLimit
      toContract,
      Buffer.alloc(0), // value = 0
      calldata,
    ]);
    const tx = parseTx(Buffer.from(encoded).toString('hex'), 1);
    expect(tx?.decodedCall).toEqual({
      kind: 'erc20-transfer',
      to: RECIPIENT,
      amount: 1000000n,
    });
  });
});
