import {Buffer} from 'buffer';
import CBOR from 'cbor-sync';
import type {EthSignRequest, ScanResult} from '../types';

function parseDerivationPath(tagged: any): string {
  // The derivation path is CBOR tagged (304) containing a map
  // with keys: 1 = components array, 2 = source fingerprint, 3 = depth
  const pathMap = tagged?.value ?? tagged;
  if (!pathMap || typeof pathMap !== 'object') {
    return 'unknown';
  }

  const components = pathMap[1] || pathMap.get?.(1);
  if (!Array.isArray(components)) {
    return 'unknown';
  }

  // Components alternate: [index, hardened, index, hardened, ...]
  const parts: string[] = [];
  for (let i = 0; i < components.length; i += 2) {
    const index = components[i];
    const hardened = components[i + 1];
    parts.push(`${index}${hardened ? "'" : ''}`);
  }

  return 'm/' + parts.join('/');
}

export function parseEthSignRequest(cborBytes: Buffer): EthSignRequest {
  const decoded = CBOR.decode(cborBytes);

  // cbor-sync decodes CBOR maps with integer keys as objects with string keys
  const signData = decoded[2] || decoded['2'];
  const dataType = decoded[3] || decoded['3'];
  const requestId = decoded[1] || decoded['1'];
  const chainId = decoded[4] || decoded['4'];
  const derivationPathRaw = decoded[5] || decoded['5'];
  const address = decoded[6] || decoded['6'];
  const origin = decoded[7] || decoded['7'];

  return {
    signData: Buffer.isBuffer(signData)
      ? signData.toString('hex')
      : String(signData),
    dataType: typeof dataType === 'number' ? dataType : 1,
    requestId: requestId
      ? Buffer.isBuffer(requestId)
        ? requestId.toString('hex')
        : String(requestId)
      : undefined,
    chainId: typeof chainId === 'number' ? chainId : undefined,
    derivationPath: parseDerivationPath(derivationPathRaw),
    address: address
      ? Buffer.isBuffer(address)
        ? '0x' + address.toString('hex')
        : String(address)
      : undefined,
    origin: typeof origin === 'string' ? origin : undefined,
  };
}

export function handleUR(type: string, cbor: Buffer): ScanResult {
  if (type === 'eth-sign-request') {
    try {
      return {kind: 'eth-sign-request', request: parseEthSignRequest(cbor)};
    } catch (e: any) {
      return {
        kind: 'error',
        message: `Failed to parse sign request: ${e.message}`,
      };
    }
  }
  return {kind: 'unsupported', type};
}
