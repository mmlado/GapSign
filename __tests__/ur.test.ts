import { URDecoder } from '@ngraveio/bc-ur';
import { CryptoPSBT } from '@keystonehq/bc-ur-registry';
import { EthSignRequest } from '@keystonehq/bc-ur-registry-eth';
import { handleUR } from '../src/utils/ur';
import { DATA_TYPE_LABELS } from '../src/types';

// ---------------------------------------------------------------------------
// Helper: build CBOR bytes from a properly encoded EthSignRequest UR
// ---------------------------------------------------------------------------

function buildCbor(
  signData: string,
  dataType: number,
  hdPath: string,
  opts: {
    xfp?: string;
    uuid?: string;
    chainId?: number;
    address?: string;
    origin?: string;
  } = {},
): Buffer {
  const req = EthSignRequest.constructETHRequest(
    Buffer.from(signData, 'hex'),
    dataType,
    hdPath,
    opts.xfp ?? '00000000',
    opts.uuid,
    opts.chainId,
    opts.address,
    opts.origin,
  );
  const decoder = new URDecoder();
  decoder.receivePart(req.toUREncoder(1000).nextPart());
  return decoder.resultUR().cbor;
}

// ---------------------------------------------------------------------------
// handleUR
// ---------------------------------------------------------------------------

describe('handleUR', () => {
  it('returns unsupported for an unrecognised UR type', () => {
    const result = handleUR('some-unknown-type', Buffer.alloc(0));
    expect(result).toEqual({ kind: 'unsupported', type: 'some-unknown-type' });
  });

  it('returns error when CBOR is invalid', () => {
    const result = handleUR('eth-sign-request', Buffer.from([0xff, 0xfe]));
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toMatch(/Failed to parse sign request/);
    }
  });

  it('parses a minimal eth-sign-request (signData + dataType only)', () => {
    const cbor = buildCbor('deadbeef', 1, "m/44'/60'/0'/0");
    const result = handleUR('eth-sign-request', cbor);

    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      const { request } = result;
      expect(request.signData).toBe('deadbeef');
      expect(request.dataType).toBe(1);
      expect(request.requestId).toBeUndefined();
      expect(request.chainId).toBeUndefined();
      expect(request.address).toBeUndefined();
      expect(request.origin).toBeUndefined();
      expect(request.derivationPath).toBe("m/44'/60'/0'/0");
    }
  });

  it('parses a full eth-sign-request with all optional fields', () => {
    const cbor = buildCbor('aabbccdd', 4, "m/44'/60'/0'/0", {
      uuid: 'b3281a82-950d-4076-934b-1aa8b4f87492',
      chainId: 1,
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      origin: 'MetaMask',
    });
    const result = handleUR('eth-sign-request', cbor);

    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      const { request } = result;
      expect(request.signData).toBe('aabbccdd');
      expect(request.dataType).toBe(4);
      expect(request.chainId).toBe(1);
      expect(request.requestId).toBe('b3281a82950d4076934b1aa8b4f87492');
      expect(request.address).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef12',
      );
      expect(request.origin).toBe('MetaMask');
      expect(request.derivationPath).toBe("m/44'/60'/0'/0");
    }
  });
});

// ---------------------------------------------------------------------------
// Derivation path parsing
// ---------------------------------------------------------------------------

describe('parseEthSignRequest – derivation paths', () => {
  it('formats hardened components with apostrophes', () => {
    const cbor = buildCbor('00', 1, "m/44'/60'/0'");
    const result = handleUR('eth-sign-request', cbor);
    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      expect(result.request.derivationPath).toBe("m/44'/60'/0'");
    }
  });

  it('formats non-hardened components without apostrophes', () => {
    const cbor = buildCbor('00', 1, 'm/0/1');
    const result = handleUR('eth-sign-request', cbor);
    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      expect(result.request.derivationPath).toBe('m/0/1');
    }
  });

  it('formats a mixed hardened/non-hardened path (standard Ethereum path)', () => {
    const cbor = buildCbor('00', 1, "m/44'/60'/0'/0/0");
    const result = handleUR('eth-sign-request', cbor);
    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      expect(result.request.derivationPath).toBe("m/44'/60'/0'/0/0");
    }
  });

  it('returns error when CBOR is malformed', () => {
    const result = handleUR('eth-sign-request', Buffer.from([0x00]));
    expect(result.kind).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// crypto-psbt
// ---------------------------------------------------------------------------

describe('handleUR – crypto-psbt', () => {
  function buildPsbtCbor(): Buffer {
    // Minimal valid PSBT: magic + empty global map
    const psbtBytes = Buffer.from(
      '70736274ff01000a0200000000000000000000',
      'hex',
    );
    return new CryptoPSBT(psbtBytes).toCBOR();
  }

  it('parses a valid crypto-psbt', () => {
    const cbor = buildPsbtCbor();
    const result = handleUR('crypto-psbt', cbor);
    expect(result.kind).toBe('crypto-psbt');
    if (result.kind === 'crypto-psbt') {
      expect(typeof result.request.psbtHex).toBe('string');
      expect(result.request.psbtHex.length).toBeGreaterThan(0);
    }
  });

  it('returns unsupported for unrecognised type (not crypto-psbt)', () => {
    const result = handleUR('unknown-type', Buffer.alloc(0));
    expect(result.kind).toBe('unsupported');
  });
});

// ---------------------------------------------------------------------------
// DATA_TYPE_LABELS
// ---------------------------------------------------------------------------

describe('DATA_TYPE_LABELS', () => {
  it('has correct labels for all ERC-4527 data types', () => {
    expect(DATA_TYPE_LABELS[1]).toBe('Legacy Transaction');
    expect(DATA_TYPE_LABELS[2]).toBe('EIP-712 Typed Data');
    expect(DATA_TYPE_LABELS[3]).toBe('Personal Message');
    expect(DATA_TYPE_LABELS[4]).toBe('EIP-1559 Transaction');
  });
});
