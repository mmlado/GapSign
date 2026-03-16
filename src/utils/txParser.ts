import { RLP } from '@ethereumjs/rlp';

export type ParsedTx = {
  to?: string;
  value?: string; // in ETH, e.g. "0.01"
  data?: string; // hex calldata
  nonce?: number;
  fees: ParsedFees;
};

export type ParsedFees =
  | { kind: 'legacy'; gasPrice: string; gasLimit: string } // gasPrice in Gwei
  | {
      kind: 'eip1559';
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
      gasLimit: string;
    }
  | { kind: 'unknown' };

function bufToHex(b: Uint8Array): string {
  return '0x' + Buffer.from(b).toString('hex');
}

function bufToBigInt(b: Uint8Array): bigint {
  if (b.length === 0) return 0n;
  return BigInt('0x' + Buffer.from(b).toString('hex'));
}

function weiToEth(wei: bigint): string {
  if (wei === 0n) return '0';
  const eth = Number(wei) / 1e18;
  if (eth < 0.000001) return wei.toString() + ' wei';
  return eth.toPrecision(6).replace(/\.?0+$/, '') + ' ETH';
}

function weiToGwei(wei: bigint): string {
  if (wei === 0n) return '0';
  const gwei = Number(wei) / 1e9;
  return gwei.toPrecision(4).replace(/\.?0+$/, '') + ' Gwei';
}

function toAddress(b: Uint8Array): string | undefined {
  if (b.length === 0) return undefined; // contract creation
  return '0x' + Buffer.from(b).toString('hex');
}

/** Parse a legacy (type 1) unsigned tx: RLP([nonce, gasPrice, gasLimit, to, value, data]) */
function parseLegacy(bytes: Buffer): ParsedTx {
  const decoded = RLP.decode(bytes) as Uint8Array[];
  const [nonce, gasPrice, gasLimit, to, value, data] = decoded;
  return {
    nonce: Number(bufToBigInt(nonce)),
    to: toAddress(to),
    value: weiToEth(bufToBigInt(value)),
    data: data.length > 0 ? bufToHex(data) : undefined,
    fees: {
      kind: 'legacy',
      gasPrice: weiToGwei(bufToBigInt(gasPrice)),
      gasLimit: bufToBigInt(gasLimit).toString(),
    },
  };
}

/** Parse an EIP-1559 (type 4 / 0x02) unsigned tx:
 *  0x02 || RLP([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList]) */
function parseEIP1559(bytes: Buffer): ParsedTx {
  // Strip the 0x02 type prefix
  const rlpBytes = bytes[0] === 0x02 ? bytes.slice(1) : bytes;
  const decoded = RLP.decode(rlpBytes) as Uint8Array[];
  const [
    ,
    nonce,
    maxPriorityFeePerGas,
    maxFeePerGas,
    gasLimit,
    to,
    value,
    data,
  ] = decoded;
  return {
    nonce: Number(bufToBigInt(nonce)),
    to: toAddress(to),
    value: weiToEth(bufToBigInt(value)),
    data: data.length > 0 ? bufToHex(data) : undefined,
    fees: {
      kind: 'eip1559',
      maxFeePerGas: weiToGwei(bufToBigInt(maxFeePerGas)),
      maxPriorityFeePerGas: weiToGwei(bufToBigInt(maxPriorityFeePerGas)),
      gasLimit: bufToBigInt(gasLimit).toString(),
    },
  };
}

/**
 * dataType 1 = Legacy transaction
 * dataType 4 = EIP-1559 transaction
 * Others (EIP-712, personal sign) are not transactions — return null.
 */
export function parseTx(
  signDataHex: string,
  dataType: number,
): ParsedTx | null {
  try {
    const bytes = Buffer.from(signDataHex, 'hex');
    if (dataType === 1) return parseLegacy(bytes);
    if (dataType === 4) return parseEIP1559(bytes);
    return null;
  } catch {
    return null;
  }
}
