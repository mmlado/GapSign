import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AddressDetailScreen from '../src/screens/address/AddressDetailScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return { MD3DarkTheme: { colors: {} }, Text };
});

jest.mock('react-native-qrcode-svg', () => 'QRCode');

const mockSetString = jest.fn();
jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: (...args: any[]) => mockSetString(...args) },
}));

// Mock PrimaryButton — capture onPress
jest.mock('../src/components/PrimaryButton', () => jest.fn(() => null));
import PrimaryButton from '../src/components/PrimaryButton';
const MockPrimaryButton = PrimaryButton as jest.MockedFunction<
  typeof PrimaryButton
>;

// Mock Icons so SVGs don't error
jest.mock('../src/assets/icons', () => ({
  Icons: { copy: 'CopyIcon', qr: 'QrIcon' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ETH_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const INDEX = 7;

const navigation = { setOptions: jest.fn() } as any;

function makeRoute(address = ETH_ADDRESS, index = INDEX) {
  return {
    key: 'AddressDetail',
    name: 'AddressDetail',
    params: { address, index },
  } as any;
}

async function renderScreen(address = ETH_ADDRESS, index = INDEX) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AddressDetailScreen
        navigation={navigation}
        route={makeRoute(address, index)}
      />,
    );
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddressDetailScreen', () => {
  beforeEach(() => {
    mockSetString.mockClear();
    MockPrimaryButton.mockClear();
    navigation.setOptions.mockClear();
  });

  describe('layout', () => {
    it('renders the address text', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain(ETH_ADDRESS);
    });

    it('passes the address to QRCode', async () => {
      const renderer = await renderScreen();
      const qr = renderer.root.findByProps({ value: ETH_ADDRESS });
      expect(qr).toBeTruthy();
    });

    it('renders the Copy Address button', async () => {
      await renderScreen();
      expect(MockPrimaryButton).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Copy Address' }),
        undefined,
      );
    });
  });

  describe('title', () => {
    it('sets the navigation title to the address index', async () => {
      await renderScreen(ETH_ADDRESS, 5);
      expect(navigation.setOptions).toHaveBeenCalledWith({ title: '5' });
    });
  });

  describe('copy', () => {
    it('copies the address to clipboard when the button is pressed', async () => {
      await renderScreen();
      const onPress = MockPrimaryButton.mock.calls[0][0].onPress;
      await act(async () => {
        onPress();
      });
      expect(mockSetString).toHaveBeenCalledWith(ETH_ADDRESS);
    });
  });
});
