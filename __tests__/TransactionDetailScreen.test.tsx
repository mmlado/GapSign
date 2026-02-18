import React, {act} from 'react';
import ReactTestRenderer from 'react-test-renderer';
import TransactionDetailScreen from '../src/screens/TransactionDetailScreen';
import type {EthSignRequest} from '../src/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

// Use react-native's own Text so rendered content is visible in the JSON tree.
jest.mock('react-native-paper', () => {
  const {Text} = require('react-native');
  return {
    MD3DarkTheme: {colors: {}},
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
        route={{params: {result}, key: 'TransactionDetail', name: 'TransactionDetail'} as any}
        navigation={{} as any}
      />,
    );
  });
  return renderer;
}

function toJson(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
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
    await expect(renderScreen({kind: 'error', message: 'Parse failed'})).resolves.toBeDefined();
  });

  it('displays the error message', async () => {
    const renderer = await renderScreen({kind: 'error', message: 'Parse failed'});
    expect(toJson(renderer)).toContain('Parse failed');
  });

  it('does not show the Sign transaction button', async () => {
    const renderer = await renderScreen({kind: 'error', message: 'error'});
    expect(toJson(renderer)).not.toContain('Sign transaction');
  });
});

describe('TransactionDetailScreen – unsupported result', () => {
  it('renders without crashing', async () => {
    await expect(renderScreen({kind: 'unsupported', type: 'eth-signature'})).resolves.toBeDefined();
  });

  it('displays the unsupported UR type', async () => {
    const renderer = await renderScreen({kind: 'unsupported', type: 'eth-signature'});
    expect(toJson(renderer)).toContain('eth-signature');
  });

  it('does not show the Sign transaction button', async () => {
    const renderer = await renderScreen({kind: 'unsupported', type: 'eth-signature'});
    expect(toJson(renderer)).not.toContain('Sign transaction');
  });
});

describe('TransactionDetailScreen – eth-sign-request result', () => {
  it('renders without crashing', async () => {
    await expect(
      renderScreen({kind: 'eth-sign-request', request: fullRequest}),
    ).resolves.toBeDefined();
  });

  it('displays the sign data', async () => {
    const renderer = await renderScreen({kind: 'eth-sign-request', request: fullRequest});
    expect(toJson(renderer)).toContain('aabbccdd');
  });

  it('displays the derivation path', async () => {
    const renderer = await renderScreen({kind: 'eth-sign-request', request: fullRequest});
    expect(toJson(renderer)).toContain("m/44'/60'/0'/0");
  });

  it('displays optional fields when present', async () => {
    const renderer = await renderScreen({kind: 'eth-sign-request', request: fullRequest});
    const json = toJson(renderer);
    expect(json).toContain('0xabcdef1234567890abcdef1234567890abcdef12');
    expect(json).toContain('MetaMask');
    expect(json).toContain('01020304');
    expect(json).toContain('1'); // chainId
  });

  it('shows the correct data type label for a known type', async () => {
    const renderer = await renderScreen({kind: 'eth-sign-request', request: fullRequest}); // dataType: 1
    expect(toJson(renderer)).toContain('Legacy Transaction');
  });

  it('falls back to "Unknown (N)" for an unrecognised data type', async () => {
    const request = {...fullRequest, dataType: 99};
    const renderer = await renderScreen({kind: 'eth-sign-request', request});
    expect(toJson(renderer)).toContain('Unknown (99)');
  });

  it('shows the Sign transaction button', async () => {
    const renderer = await renderScreen({kind: 'eth-sign-request', request: fullRequest});
    expect(toJson(renderer)).toContain('Sign transaction');
  });

  it('renders correctly with only required fields (no optional fields)', async () => {
    const minimalRequest: EthSignRequest = {
      signData: 'cafebabe',
      dataType: 3,
      derivationPath: 'unknown',
    };
    const renderer = await renderScreen({kind: 'eth-sign-request', request: minimalRequest});
    const json = toJson(renderer);
    expect(json).toContain('cafebabe');
    expect(json).toContain('Personal Message');
    expect(json).not.toContain('MetaMask');
  });
});
