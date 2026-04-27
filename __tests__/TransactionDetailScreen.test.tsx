import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import TransactionDetailScreen from '../src/screens/TransactionDetailScreen';
import type { EthSignRequest } from '../src/types';

// PSBT with one input and one output so inspectBtcPsbt can parse it fully
const VALID_PSBT_HEX = (() => {
  const { Psbt, payments, networks } = require('bitcoinjs-lib');
  const psbt = new Psbt({ network: networks.testnet });
  const fakePubkey = Buffer.alloc(33, 0x02);
  const { output } = payments.p2wpkh({
    pubkey: fakePubkey,
    network: networks.testnet,
  });
  psbt.addInput({
    hash: Buffer.alloc(32, 0xaa),
    index: 0,
    bip32Derivation: [
      {
        masterFingerprint: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
        path: "m/84'/1'/0'/0/0",
        pubkey: fakePubkey,
      },
    ],
  });
  psbt.addOutput({ script: output!, value: 90_000 });
  return psbt.toBuffer().toString('hex');
})();

const BIP322_PSBT_HEX = (() => {
  const {
    Psbt,
    Transaction,
    payments,
    networks,
    script,
    opcodes,
  } = require('bitcoinjs-lib');

  const fakePubkey = Buffer.alloc(33, 0x02);
  const { output } = payments.p2wpkh({
    pubkey: fakePubkey,
    network: networks.testnet,
  });

  const toSpend = new Transaction();
  toSpend.version = 0;
  toSpend.addInput(
    Buffer.alloc(32, 0x00),
    0xffffffff,
    0,
    script.compile([opcodes.OP_0, Buffer.alloc(32, 0x11)]),
  );
  toSpend.addOutput(output!, 0);

  const psbt = new Psbt({ network: networks.testnet });
  psbt.setVersion(0);
  psbt.addInput({
    hash: toSpend.getHash(),
    index: 0,
    sequence: 0,
    witnessUtxo: {
      script: output!,
      value: 0,
    },
    bip32Derivation: [
      {
        masterFingerprint: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
        path: "m/84'/1'/0'/0/0",
        pubkey: fakePubkey,
      },
    ],
  });
  psbt.addOutput({ script: Buffer.from([0x6a]), value: 0 });

  return psbt.toBuffer().toString('hex');
})();

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Use react-native's own Text so rendered content is visible in the JSON tree.
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

async function renderScreen(result: any) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <TransactionDetailScreen
        route={
          {
            params: { result },
            key: 'TransactionDetail',
            name: 'TransactionDetail',
          } as any
        }
        navigation={{} as any}
      />,
    );
  });
  return renderer;
}

const fullRequest: EthSignRequest = {
  signData: 'aabbccdd',
  dataType: 1,
  derivationPath: "m/44'/60'/0'/0",
  chainId: 1,
  address: '0xabcdef1234567890abcdef1234567890abcdef12',
  origin: 'MetaMask',
  requestId: '01020304',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TransactionDetailScreen – error result', () => {
  it('renders without crashing', async () => {
    await expect(
      renderScreen({ kind: 'error', message: 'Parse failed' }),
    ).resolves.toBeDefined();
  });

  it('displays the error message', async () => {
    const renderer = await renderScreen({
      kind: 'error',
      message: 'Parse failed',
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('Parse failed');
  });

  it('does not show the Sign transaction button', async () => {
    const renderer = await renderScreen({ kind: 'error', message: 'error' });
    expect(JSON.stringify(renderer.toJSON())).not.toContain('Sign transaction');
  });
});

describe('TransactionDetailScreen – unsupported result', () => {
  it('renders without crashing', async () => {
    await expect(
      renderScreen({ kind: 'unsupported', type: 'eth-signature' }),
    ).resolves.toBeDefined();
  });

  it('displays the unsupported UR type', async () => {
    const renderer = await renderScreen({
      kind: 'unsupported',
      type: 'eth-signature',
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('eth-signature');
  });

  it('does not show the Sign transaction button', async () => {
    const renderer = await renderScreen({
      kind: 'unsupported',
      type: 'eth-signature',
    });
    expect(JSON.stringify(renderer.toJSON())).not.toContain('Sign transaction');
  });
});

describe('TransactionDetailScreen – eth-sign-request result', () => {
  it('renders without crashing', async () => {
    await expect(
      renderScreen({ kind: 'eth-sign-request', request: fullRequest }),
    ).resolves.toBeDefined();
  });

  it('displays the sign data', async () => {
    const renderer = await renderScreen({
      kind: 'eth-sign-request',
      request: fullRequest,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('aabbccdd');
  });

  it('displays the derivation path', async () => {
    const renderer = await renderScreen({
      kind: 'eth-sign-request',
      request: fullRequest,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("m/44'/60'/0'/0");
  });

  it('displays optional fields when present', async () => {
    const renderer = await renderScreen({
      kind: 'eth-sign-request',
      request: fullRequest,
    });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('0xabcdef1234567890abcdef1234567890abcdef12');
    expect(json).toContain('MetaMask');
    expect(json).toContain('01020304');
    expect(json).toContain('1'); // chainId
  });

  it('shows the correct data type label for a known type', async () => {
    const renderer = await renderScreen({
      kind: 'eth-sign-request',
      request: fullRequest,
    }); // dataType: 1
    expect(JSON.stringify(renderer.toJSON())).toContain('Legacy Transaction');
  });

  it('falls back to "Unknown (N)" for an unrecognised data type', async () => {
    const request = { ...fullRequest, dataType: 99 };
    const renderer = await renderScreen({ kind: 'eth-sign-request', request });
    expect(JSON.stringify(renderer.toJSON())).toContain('Unknown (99)');
  });

  it('shows the Sign transaction button', async () => {
    const renderer = await renderScreen({
      kind: 'eth-sign-request',
      request: fullRequest,
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('Sign transaction');
  });

  it('renders correctly with only required fields (no optional fields)', async () => {
    const minimalRequest: EthSignRequest = {
      signData: 'cafebabe',
      dataType: 3,
      derivationPath: 'unknown',
    };
    const renderer = await renderScreen({
      kind: 'eth-sign-request',
      request: minimalRequest,
    });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('cafebabe');
    expect(json).toContain('Personal Message');
    expect(json).not.toContain('MetaMask');
  });

  it('displays decoded EIP-712 domain and message fields when signData is json', async () => {
    const typedDataJson = JSON.stringify({
      types: {
        EIP712Domain: [{ name: 'name', type: 'string' }],
        Mail: [{ name: 'contents', type: 'string' }],
      },
      primaryType: 'Mail',
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
      },
      message: {
        contents: 'Hello, Bob!',
        account: '0x1234',
      },
    });
    const renderer = await renderScreen({
      kind: 'eth-sign-request',
      request: {
        signData: Buffer.from(typedDataJson, 'utf8').toString('hex'),
        dataType: 2,
        derivationPath: "m/44'/60'/0'/0",
        origin: 'MetaMask',
      },
    });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('EIP-712 Typed Data');
    expect(json).toContain('Primary type');
    expect(json).toContain('Mail');
    expect(json).toContain('EIP-712 Domain');
    expect(json).toContain('Ether Mail');
    expect(json).toContain('Message Fields');
    expect(json).toContain('Hello, Bob!');
    expect(json).toContain('0x1234');
  });
});

describe('TransactionDetailScreen – crypto-psbt result', () => {
  it('renders without crashing', async () => {
    await expect(
      renderScreen({
        kind: 'crypto-psbt',
        request: { psbtHex: VALID_PSBT_HEX },
      }),
    ).resolves.toBeDefined();
  });

  it('shows the Sign transaction button', async () => {
    const renderer = await renderScreen({
      kind: 'crypto-psbt',
      request: { psbtHex: VALID_PSBT_HEX },
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('Sign transaction');
  });

  it('shows Bitcoin PSBT label', async () => {
    const renderer = await renderScreen({
      kind: 'crypto-psbt',
      request: { psbtHex: VALID_PSBT_HEX },
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('Bitcoin PSBT');
  });

  it('shows Invalid PSBT error for malformed hex', async () => {
    const renderer = await renderScreen({
      kind: 'crypto-psbt',
      request: { psbtHex: 'deadbeef' },
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('Invalid PSBT');
  });

  it('shows Sign transaction button even on invalid PSBT (screen-level decision)', async () => {
    const renderer = await renderScreen({
      kind: 'crypto-psbt',
      request: { psbtHex: 'deadbeef' },
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('Sign transaction');
  });

  it('shows BIP-322 requests as message signing', async () => {
    const renderer = await renderScreen({
      kind: 'crypto-psbt',
      request: { psbtHex: BIP322_PSBT_HEX },
    });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Bitcoin Message');
    expect(json).toContain('BIP-322 Message');
    expect(json).toContain('Sign message');
  });
});

describe('TransactionDetailScreen – btc-sign-request result', () => {
  it('shows message signing details and CTA', async () => {
    const renderer = await renderScreen({
      kind: 'btc-sign-request',
      request: {
        requestId: '00112233445566778899aabbccddeeff',
        signDataHex: Buffer.from('hello btc', 'utf8').toString('hex'),
        dataType: 1,
        derivationPath: "m/84'/0'/0'/0/3",
        address: 'bc1qexampleaddress',
        origin: 'Sparrow',
      },
    });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Bitcoin Message');
    expect(json).toContain('btc-sign-request');
    expect(json).toContain('hello btc');
    expect(json).toContain('Sign message');
  });
});
