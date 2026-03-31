import { RLP } from '@ethereumjs/rlp';

import { getTxLabel, parseTx } from '../src/utils/txParser';

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

  it('returns null for non-transaction dataType (EIP-712)', () => {
    expect(parseTx('deadbeef', 2)).toBeNull();
  });

  it('returns null for malformed hex', () => {
    expect(parseTx('zzzz', 1)).toBeNull();
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
