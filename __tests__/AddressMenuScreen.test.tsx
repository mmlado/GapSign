import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { getActivePressables } from './testUtils';
import AddressMenuScreen, {
  dashboardEntry,
} from '../src/screens/address/AddressMenuScreen';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = { navigate: jest.fn() } as any;
const route = { key: 'AddressMenu', name: 'AddressMenu' } as any;

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AddressMenuScreen navigation={navigation} route={route} />,
    );
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddressMenuScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  describe('layout', () => {
    it('renders the "Ethereum" menu entry', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain('Ethereum');
    });

    it('renders the "Bitcoin" menu entry', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain('Bitcoin');
    });

    it('shows the NFC indicator for both address entries', async () => {
      const renderer = await renderScreen();
      expect(
        renderer.root.findAll(
          (node: any) => node.props.testID === 'menu-nfc-indicator-0',
        ),
      ).toHaveLength(1);
      expect(
        renderer.root.findAll(
          (node: any) => node.props.testID === 'menu-nfc-indicator-1',
        ),
      ).toHaveLength(1);
    });
  });

  describe('navigation', () => {
    it('navigates to AddressList with coin=eth when Ethereum is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      // First entry is Ethereum
      await act(async () => {
        pressables[0].props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('AddressList', {
        coin: 'eth',
      });
    });

    it('navigates to AddressList with coin=btc when Bitcoin is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      // Second entry is Bitcoin
      await act(async () => {
        pressables[1].props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('AddressList', {
        coin: 'btc',
      });
    });
  });

  describe('dashboardEntry', () => {
    it('has the correct label', () => {
      expect(dashboardEntry.label).toBe('Addresses');
    });

    it('navigates to AddressMenu when invoked', () => {
      const nav = { navigate: jest.fn() } as any;
      dashboardEntry.navigate(nav);
      expect(nav.navigate).toHaveBeenCalledWith('AddressMenu');
    });
  });
});
