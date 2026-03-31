import { EthSignRequest } from '@keystonehq/bc-ur-registry-eth';

import type {
  EthSignRequest as EthSignRequestType,
  ScanResult,
} from '../types';
import { parseBtcSignRequest } from './btcMessage';
import { parseCryptoPsbtRequest } from './btcPsbt';

function parseEthSignRequest(cbor: Buffer): EthSignRequestType {
  const parsed = EthSignRequest.fromCBOR(cbor);

  const signDataBuf = parsed.getSignData();
  const requestIdBuf = parsed.getRequestId() as Buffer | undefined;
  const address = (parsed as any).getSignRequestAddress?.() as
    | Buffer
    | undefined;

  return {
    signData: Buffer.isBuffer(signDataBuf)
      ? signDataBuf.toString('hex')
      : String(signDataBuf),
    dataType: parsed.getDataType() ?? 1,
    requestId: requestIdBuf
      ? Buffer.isBuffer(requestIdBuf)
        ? requestIdBuf.toString('hex')
        : String(requestIdBuf)
      : undefined,
    chainId: parsed.getChainId(),
    derivationPath: `m/${parsed.getDerivationPath() as string}`,
    address: address
      ? Buffer.isBuffer(address)
        ? '0x' + address.toString('hex')
        : String(address)
      : undefined,
    origin: parsed.getOrigin(),
  };
}

export function handleUR(type: string, cbor: Buffer): ScanResult {
  if (type === 'eth-sign-request') {
    try {
      return { kind: 'eth-sign-request', request: parseEthSignRequest(cbor) };
    } catch (e: any) {
      return {
        kind: 'error',
        message: `Failed to parse sign request: ${e.message}`,
      };
    }
  }

  if (type === 'crypto-psbt') {
    try {
      return { kind: 'crypto-psbt', request: parseCryptoPsbtRequest(cbor) };
    } catch (e: any) {
      return {
        kind: 'error',
        message: `Failed to parse PSBT: ${e.message}`,
      };
    }
  }

  if (type === 'btc-sign-request') {
    try {
      return { kind: 'btc-sign-request', request: parseBtcSignRequest(cbor) };
    } catch (e: any) {
      return {
        kind: 'error',
        message: `Failed to parse BTC sign request: ${e.message}`,
      };
    }
  }

  return { kind: 'unsupported', type };
}
