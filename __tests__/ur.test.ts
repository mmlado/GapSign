import {Buffer} from 'buffer';
import CBOR from 'cbor-sync';
import {handleUR} from '../src/utils/ur';
import {DATA_TYPE_LABELS} from '../src/types';

// ---------------------------------------------------------------------------
// handleUR
// ---------------------------------------------------------------------------

describe('handleUR', () => {
  it('returns unsupported for an unrecognised UR type', () => {
    const result = handleUR('some-unknown-type', Buffer.alloc(0));
    expect(result).toEqual({kind: 'unsupported', type: 'some-unknown-type'});
  });

  it('returns error when CBOR.decode throws', () => {
    // cbor-sync is lenient and won't throw on its own for most bad inputs,
    // so we simulate a decode failure with a spy.
    const cborModule = require('cbor-sync');
    const spy = jest.spyOn(cborModule, 'decode').mockImplementation(() => {
      throw new Error('unexpected end of input');
    });

    const result = handleUR('eth-sign-request', Buffer.from('anything'));
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toMatch(/Failed to parse sign request/);
    }

    spy.mockRestore();
  });

  it('parses a minimal eth-sign-request (signData + dataType only)', () => {
    const encoded = CBOR.encode({2: Buffer.from('deadbeef', 'hex'), 3: 1});
    const result = handleUR('eth-sign-request', encoded);

    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      const {request} = result;
      expect(request.signData).toBe('deadbeef');
      expect(request.dataType).toBe(1);
      expect(request.requestId).toBeUndefined();
      expect(request.chainId).toBeUndefined();
      expect(request.address).toBeUndefined();
      expect(request.origin).toBeUndefined();
      expect(request.derivationPath).toBe('unknown');
    }
  });

  it('parses a full eth-sign-request with all optional fields', () => {
    const encoded = CBOR.encode({
      1: Buffer.from('01020304', 'hex'),                                        // requestId
      2: Buffer.from('aabbccdd', 'hex'),                                        // signData
      3: 4,                                                                     // dataType: EIP-1559
      4: 1,                                                                     // chainId: mainnet
      5: {1: [44, true, 60, true, 0, true, 0, false]},                         // derivation path
      6: Buffer.from('abcdef1234567890abcdef1234567890abcdef12', 'hex'),        // address
      7: 'MetaMask',                                                            // origin
    });
    const result = handleUR('eth-sign-request', encoded);

    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      const {request} = result;
      expect(request.signData).toBe('aabbccdd');
      expect(request.dataType).toBe(4);
      expect(request.chainId).toBe(1);
      expect(request.requestId).toBe('01020304');
      expect(request.address).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(request.origin).toBe('MetaMask');
      expect(request.derivationPath).toBe("m/44'/60'/0'/0");
    }
  });
});

// ---------------------------------------------------------------------------
// Derivation path parsing
// ---------------------------------------------------------------------------

describe('parseEthSignRequest – derivation paths', () => {
  function encodeWithComponents(components: any[]): Buffer {
    return CBOR.encode({2: Buffer.from('00', 'hex'), 3: 1, 5: {1: components}});
  }

  it('formats hardened components with apostrophes', () => {
    const result = handleUR('eth-sign-request', encodeWithComponents([44, true, 60, true, 0, true]));
    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      expect(result.request.derivationPath).toBe("m/44'/60'/0'");
    }
  });

  it('formats non-hardened components without apostrophes', () => {
    const result = handleUR('eth-sign-request', encodeWithComponents([0, false, 1, false]));
    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      expect(result.request.derivationPath).toBe('m/0/1');
    }
  });

  it('formats a mixed hardened/non-hardened path (standard Ethereum path)', () => {
    const result = handleUR(
      'eth-sign-request',
      encodeWithComponents([44, true, 60, true, 0, true, 0, false, 0, false]),
    );
    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      expect(result.request.derivationPath).toBe("m/44'/60'/0'/0/0");
    }
  });

  it('returns "unknown" when the derivation path field is absent', () => {
    const encoded = CBOR.encode({2: Buffer.from('00', 'hex'), 3: 1});
    const result = handleUR('eth-sign-request', encoded);
    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      expect(result.request.derivationPath).toBe('unknown');
    }
  });

  it('returns "unknown" for an invalid path structure', () => {
    const encoded = CBOR.encode({2: Buffer.from('00', 'hex'), 3: 1, 5: 'not-a-map'});
    const result = handleUR('eth-sign-request', encoded);
    expect(result.kind).toBe('eth-sign-request');
    if (result.kind === 'eth-sign-request') {
      expect(result.request.derivationPath).toBe('unknown');
    }
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
