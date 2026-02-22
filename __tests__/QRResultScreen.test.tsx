import React, {act} from 'react';
import ReactTestRenderer from 'react-test-renderer';
import QRResultScreen from '../src/screens/QRResultScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-paper', () => {
  const {Text} = require('react-native');
  return {
    MD3DarkTheme: {colors: {}},
    Text,
  };
});

jest.mock('react-native-qrcode-svg', () => () => null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_UR =
  'ur:eth-signature/oyadtpdagdndcawmgtfrkigrpmndutdnbtmkestlrfamjljkjkisdljzjljedrfgwzrd';

async function renderScreen(
  urString: string,
  label?: string,
  navigation?: object,
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QRResultScreen
        route={
          {
            params: {urString, label},
            key: 'QRResult',
            name: 'QRResult',
          } as any
        }
        navigation={(navigation ?? {reset: jest.fn()}) as any}
      />,
    );
  });
  return renderer;
}

function toJson(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QRResultScreen', () => {
  it('renders without crashing', async () => {
    await expect(renderScreen(SAMPLE_UR, 'Scan with MetaMask')).resolves.toBeDefined();
  });

  it('displays the label when provided', async () => {
    const renderer = await renderScreen(SAMPLE_UR, 'Scan with MetaMask');
    expect(toJson(renderer)).toContain('Scan with MetaMask');
  });

  it('does not render the label when absent', async () => {
    const renderer = await renderScreen(SAMPLE_UR);
    expect(toJson(renderer)).not.toContain('Scan with MetaMask');
  });

  it('displays the UR string', async () => {
    const renderer = await renderScreen(SAMPLE_UR);
    expect(toJson(renderer)).toContain(SAMPLE_UR);
  });

  it('renders the "Scan another transaction" button', async () => {
    const renderer = await renderScreen(SAMPLE_UR);
    expect(toJson(renderer)).toContain('Scan another transaction');
  });

  it('"Scan another transaction" resets navigation to QRScanner', async () => {
    const reset = jest.fn();
    const renderer = await renderScreen(SAMPLE_UR, undefined, {reset});

    // Find the Pressable — the only touchable node with an onPress handler.
    const pressable = renderer.root.find(
      (node: any) => typeof node.props.onPress === 'function',
    );
    await act(async () => {
      pressable.props.onPress();
    });

    expect(reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{name: 'QRScanner'}],
    });
  });
});
