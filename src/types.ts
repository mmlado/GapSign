export type EthSignRequest = {
  requestId?: string;
  signData: string;
  dataType: number;
  chainId?: number;
  derivationPath: string;
  address?: string;
  origin?: string;
};

export type ScanResult =
  | {kind: 'eth-sign-request'; request: EthSignRequest}
  | {kind: 'unsupported'; type: string}
  | {kind: 'error'; message: string};

// ERC-4527 eth-sign-request data types
export const DATA_TYPE_LABELS: Record<number, string> = {
  1: 'Legacy Transaction',
  2: 'EIP-712 Typed Data',
  3: 'Personal Message',
  4: 'EIP-1559 Transaction',
};
