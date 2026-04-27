import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

import QRResultScreen from '../src/screens/QRResultScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return {
    MD3DarkTheme: { colors: {} },
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
  title = 'Show signature to the wallet',
  navigation?: object,
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QRResultScreen
        route={
          {
            params: { urString, title },
            key: 'QRResult',
            name: 'QRResult',
          } as any
        }
        navigation={
          (navigation ?? {
            reset: jest.fn(),
            setOptions: jest.fn(),
          }) as any
        }
      />,
    );
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QRResultScreen', () => {
  it('renders without crashing', async () => {
    await expect(renderScreen(SAMPLE_UR)).resolves.toBeDefined();
  });

  it('renders the "Done" button', async () => {
    const renderer = await renderScreen(SAMPLE_UR);
    expect(JSON.stringify(renderer.toJSON())).toContain('Done');
  });

  it('calls setOptions with the provided title', async () => {
    const setOptions = jest.fn();
    await renderScreen(SAMPLE_UR, 'Show key to the wallet', {
      reset: jest.fn(),
      setOptions,
    });
    expect(setOptions).toHaveBeenCalledWith({
      title: 'Show key to the wallet',
    });
  });

  it('"Done" resets navigation to Dashboard', async () => {
    const reset = jest.fn();
    const renderer = await renderScreen(
      SAMPLE_UR,
      'Show signature to the wallet',
      {
        reset,
        setOptions: jest.fn(),
      },
    );

    const pressable = renderer.root.find(
      (node: any) => typeof node.props.onPress === 'function',
    );
    await act(async () => {
      pressable.props.onPress();
    });

    expect(reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Dashboard' }],
    });
  });
});
