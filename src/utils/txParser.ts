import { RLP } from '@ethereumjs/rlp';
import {
  decodeAbiParameters,
  formatEther,
  formatGwei,
  type AbiParameter,
} from 'viem';

import { DATA_TYPE_LABELS } from '../types';
import selectorsData from '../data/selectors.json';

type SelectorArg = AbiParameter & { name: string };

type SelectorEntry = {
  name: string;
  signature: string;
  args: SelectorArg[];
  highRisk?: boolean;
  risk?: string;
};

type SelectorsData = {
  selectors: Record<string, SelectorEntry[]>;
};

export type DecodedCallArg = {
  name: string;
  type: string;
  value: string;
};

export type DecodedCall =
  | { kind: 'erc20-transfer'; to: string; amount: bigint }
  | { kind: 'erc20-transferFrom'; from: string; to: string; amount: bigint }
  | { kind: 'erc20-approve'; spender: string; amount: bigint }
  | {
      kind: 'contract-call';
      selector: string;
      functionName: string;
      signature: string;
      args: DecodedCallArg[];
      highRisk?: boolean;
      risk?: string;
    }
  | { kind: 'unknown-call'; selector: string };

const selectors = (selectorsData as SelectorsData).selectors;

function formatDecodedValue(value: unknown): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value == null) return String(value);
  return JSON.stringify(value, (_, nested) =>
    typeof nested === 'bigint' ? nested.toString() : nested,
  );
}

function toSpecializedDecodedCall(
  entry: SelectorEntry,
  decodedArgs: readonly unknown[],
): DecodedCall | null {
  if (entry.signature === 'transfer(address,uint256)') {
    return {
      kind: 'erc20-transfer',
      to: decodedArgs[0] as string,
      amount: decodedArgs[1] as bigint,
    };
  }
  if (entry.signature === 'transferFrom(address,address,uint256)') {
    return {
      kind: 'erc20-transferFrom',
      from: decodedArgs[0] as string,
      to: decodedArgs[1] as string,
      amount: decodedArgs[2] as bigint,
    };
  }
  if (entry.signature === 'approve(address,uint256)') {
    return {
      kind: 'erc20-approve',
      spender: decodedArgs[0] as string,
      amount: decodedArgs[1] as bigint,
    };
  }
  return null;
}

export function decodeCalldata(dataHex: string): DecodedCall | null {
  if (!dataHex || dataHex === '0x' || dataHex.replace('0x', '').length < 8) {
    return null;
  }

  const selector = dataHex.slice(0, 10).toLowerCase();
  const entries = selectors[selector];
  if (!entries) {
    return { kind: 'unknown-call', selector };
  }

  const encodedArgs = `0x${dataHex.slice(10)}` as `0x${string}`;
  for (const entry of entries) {
    try {
      const decodedArgs = decodeAbiParameters(entry.args, encodedArgs);
      const specialized = toSpecializedDecodedCall(entry, decodedArgs);
      if (specialized) return specialized;

      const isHighRiskApproval =
        entry.name === 'setApprovalForAll' && decodedArgs[1] === true;
      return {
        kind: 'contract-call',
        selector,
        functionName: entry.name,
        signature: entry.signature,
        args: entry.args.map((arg, index) => ({
          name: arg.name || `arg${index}`,
          type: arg.type,
          value: formatDecodedValue(decodedArgs[index]),
        })),
        highRisk: entry.highRisk && isHighRiskApproval,
        risk: entry.highRisk && isHighRiskApproval ? entry.risk : undefined,
      };
    } catch {
      // Try the next overloaded ABI entry for this selector.
    }
  }

  return { kind: 'unknown-call', selector };
}

export type ParsedTx = {
  to?: string;
  value?: string; // in ETH, e.g. "0.01"
  data?: string; // hex calldata
  decodedCall?: DecodedCall;
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

type RlpBytes = Uint8Array;
type RlpValue = RlpBytes | RlpValue[];

function bufToHex(b: Uint8Array): string {
  return '0x' + Buffer.from(b).toString('hex');
}

function bufToBigInt(b: Uint8Array): bigint {
  if (b.length === 0) return 0n;
  return BigInt('0x' + Buffer.from(b).toString('hex'));
}

function weiToNative(wei: bigint, symbol: string): string {
  if (wei === 0n) {
    return '0';
  }

  const eth = formatEther(wei);
  if (Number(eth) < 0.000001) {
    return `${wei.toString()} wei`;
  }

  return `${eth} ${symbol}`;
}

function weiToGwei(wei: bigint): string {
  if (wei === 0n) {
    return '0';
  }

  return `${formatGwei(wei)} Gwei`;
}

function toAddress(b: Uint8Array): string | undefined {
  if (b.length === 0) return undefined; // contract creation
  return '0x' + Buffer.from(b).toString('hex');
}

function isBytes(value: RlpValue | undefined): value is RlpBytes {
  return value instanceof Uint8Array;
}

function assertBytes(value: RlpValue | undefined, field: string): RlpBytes {
  if (!isBytes(value)) {
    throw new Error(`Invalid Ethereum transaction: ${field} must be bytes`);
  }
  return value;
}

function assertList(value: RlpValue | undefined, field: string): RlpValue[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Invalid Ethereum transaction: ${field} must be an RLP list`,
    );
  }
  return value;
}

/** Parse a legacy (type 1) unsigned tx: RLP([nonce, gasPrice, gasLimit, to, value, data]) */
function parseLegacy(bytes: Buffer, symbol: string): ParsedTx {
  const decoded = assertList(RLP.decode(bytes) as RlpValue, 'legacy payload');
  if (decoded.length < 6) {
    throw new Error(
      'Invalid Ethereum transaction: legacy payload is incomplete',
    );
  }
  const [nonce, gasPrice, gasLimit, to, value, data] = decoded;
  const dataHex =
    assertBytes(data, 'data').length > 0
      ? bufToHex(assertBytes(data, 'data'))
      : undefined;
  return {
    nonce: Number(bufToBigInt(assertBytes(nonce, 'nonce'))),
    to: toAddress(assertBytes(to, 'to')),
    value: weiToNative(bufToBigInt(assertBytes(value, 'value')), symbol),
    data: dataHex,
    decodedCall: dataHex ? decodeCalldata(dataHex) ?? undefined : undefined,
    fees: {
      kind: 'legacy',
      gasPrice: weiToGwei(bufToBigInt(assertBytes(gasPrice, 'gasPrice'))),
      gasLimit: bufToBigInt(assertBytes(gasLimit, 'gasLimit')).toString(),
    },
  };
}

/** Parse an EIP-1559 (type 4 / 0x02) unsigned tx:
 *  0x02 || RLP([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList]) */
function parseEIP1559(bytes: Buffer, symbol: string): ParsedTx {
  // Strip the 0x02 type prefix
  const rlpBytes = bytes[0] === 0x02 ? bytes.slice(1) : bytes;
  const decoded = assertList(
    RLP.decode(rlpBytes) as RlpValue,
    'EIP-1559 payload',
  );
  if (decoded.length !== 9) {
    throw new Error(
      'Invalid Ethereum transaction: EIP-1559 payload must have 9 fields',
    );
  }
  const [
    ,
    nonce,
    maxPriorityFeePerGas,
    maxFeePerGas,
    gasLimit,
    to,
    value,
    data,
    accessList,
  ] = decoded;
  assertList(accessList, 'accessList');
  const dataHexEip1559 =
    assertBytes(data, 'data').length > 0
      ? bufToHex(assertBytes(data, 'data'))
      : undefined;
  return {
    nonce: Number(bufToBigInt(assertBytes(nonce, 'nonce'))),
    to: toAddress(assertBytes(to, 'to')),
    value: weiToNative(bufToBigInt(assertBytes(value, 'value')), symbol),
    data: dataHexEip1559,
    decodedCall: dataHexEip1559
      ? decodeCalldata(dataHexEip1559) ?? undefined
      : undefined,
    fees: {
      kind: 'eip1559',
      maxFeePerGas: weiToGwei(
        bufToBigInt(assertBytes(maxFeePerGas, 'maxFeePerGas')),
      ),
      maxPriorityFeePerGas: weiToGwei(
        bufToBigInt(assertBytes(maxPriorityFeePerGas, 'maxPriorityFeePerGas')),
      ),
      gasLimit: bufToBigInt(assertBytes(gasLimit, 'gasLimit')).toString(),
    },
  };
}

/** EIP-2930 (type 0x01): 0x01 || RLP([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList]) */
function parseEIP2930(bytes: Buffer, symbol: string): ParsedTx {
  const rlpBytes = bytes.slice(1);
  const decoded = assertList(
    RLP.decode(rlpBytes) as RlpValue,
    'EIP-2930 payload',
  );
  if (decoded.length !== 8) {
    throw new Error(
      'Invalid Ethereum transaction: EIP-2930 payload must have 8 fields',
    );
  }
  const [, nonce, gasPrice, gasLimit, to, value, data, accessList] = decoded;
  assertList(accessList, 'accessList');
  const dataHexEip2930 =
    assertBytes(data, 'data').length > 0
      ? bufToHex(assertBytes(data, 'data'))
      : undefined;
  return {
    nonce: Number(bufToBigInt(assertBytes(nonce, 'nonce'))),
    to: toAddress(assertBytes(to, 'to')),
    value: weiToNative(bufToBigInt(assertBytes(value, 'value')), symbol),
    data: dataHexEip2930,
    decodedCall: dataHexEip2930
      ? decodeCalldata(dataHexEip2930) ?? undefined
      : undefined,
    fees: {
      kind: 'legacy',
      gasPrice: weiToGwei(bufToBigInt(assertBytes(gasPrice, 'gasPrice'))),
      gasLimit: bufToBigInt(assertBytes(gasLimit, 'gasLimit')).toString(),
    },
  };
}

/**
 * dataType 1 = Legacy transaction (or EIP-2930 if first byte is 0x01)
 * dataType 4 = EIP-1559 transaction
 * Others (EIP-712, personal sign) are not transactions — return null.
 */
export function parseTx(
  signDataHex: string,
  dataType: number,
  nativeCurrencySymbol: string = 'ETH',
): ParsedTx | null {
  try {
    const bytes = Buffer.from(signDataHex, 'hex');
    if (dataType === 1 && bytes[0] === 0x01)
      return parseEIP2930(bytes, nativeCurrencySymbol);
    if (dataType === 1) return parseLegacy(bytes, nativeCurrencySymbol);
    if (dataType === 4) return parseEIP1559(bytes, nativeCurrencySymbol);
    return null;
  } catch {
    return null;
  }
}

export function validateEthTransactionSignData(
  signDataHex: string,
  dataType: number,
): void {
  if (dataType !== 1 && dataType !== 4) {
    return;
  }

  const tx = parseTx(signDataHex, dataType);
  if (!tx) {
    throw new Error('Invalid Ethereum transaction payload');
  }
}

/**
 * Returns a human-readable label for the transaction type.
 * Distinguishes EIP-2930 from legacy even though both arrive with dataType=1.
 */
export function getTxLabel(signDataHex: string, dataType: number): string {
  if (dataType === 1) {
    const bytes = Buffer.from(signDataHex, 'hex');
    if (bytes[0] === 0x01) return 'EIP-2930 Transaction';
    return 'Legacy Transaction';
  }
  return DATA_TYPE_LABELS[dataType] ?? `Unknown (${dataType})`;
}
