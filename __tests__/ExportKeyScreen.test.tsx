import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ExportKeyScreen, {
  dashboardEntry,
} from '../src/screens/ExportKeyScreen';

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

// ExportKeyScreen imports dashboardActions for border-style calculation.
jest.mock('../src/navigation/dashboardActions', () => ({
  dashboardActions: [{ label: 'Connect software wallet', navigate: jest.fn() }],
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = { navigate: jest.fn() } as any;

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ExportKeyScreen
        navigation={navigation}
        route={{ key: 'ExportKey', name: 'ExportKey' } as any}
      />,
    );
  });
  return renderer;
}

function toJson(r: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(r.toJSON());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExportKeyScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  describe('layout', () => {
    it('renders without crashing', async () => {
      await expect(renderScreen()).resolves.toBeDefined();
    });

    it('renders the Ethereum option', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('Ethereum');
    });

    it('shows the NFC indicator for every export option', async () => {
      const renderer = await renderScreen();

      for (const index of [0, 1, 2, 3, 4, 5, 6]) {
        expect(
          renderer.root.findAll(
            (node: any) => node.props.testID === `menu-nfc-indicator-${index}`,
          ),
        ).toHaveLength(1);
      }
    });
  });

  describe('navigation', () => {
    it('navigates to Keycard with export_key operation when Ethereum is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
      );
      const pressable = pressables.find(
        node =>
          node.findAll((n: any) => n.props.children === 'Ethereum').length > 0,
      )!;
      await act(async () => {
        pressable.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
      });
    });

    it('navigates to Keycard with source "account.ledger_live" when Ledger Live is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
      );
      const pressable = pressables.find(
        node =>
          node.findAll((n: any) => n.props.children === 'Ledger Live').length >
          0,
      )!;
      expect(pressable).toBeDefined();
      await act(async () => {
        pressable.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
        source: 'account.ledger_live',
      });
    });

    it('navigates to Keycard with source "account.ledger_legacy" when Ledger Legacy is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
      );
      const pressable = pressables.find(
        node =>
          node.findAll((n: any) => n.props.children === 'Ledger Legacy')
            .length > 0,
      )!;
      expect(pressable).toBeDefined();
      await act(async () => {
        pressable.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
        source: 'account.ledger_legacy',
      });
    });

    it('navigates to Keycard with derivationPath "bitget" when Bitget is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
      );
      const pressable = pressables.find(
        node =>
          node.findAll((n: any) => n.props.children === 'Bitget').length > 0,
      )!;
      expect(pressable).toBeDefined();
      await act(async () => {
        pressable.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: 'bitget',
      });
    });
  });

  describe('dashboardEntry', () => {
    it('has label "Connect software wallet"', () => {
      expect(dashboardEntry.label).toBe('Connect software wallet');
    });

    it('calls navigation.navigate("ExportKey") when invoked', () => {
      const nav = { navigate: jest.fn() } as any;
      dashboardEntry.navigate(nav);
      expect(nav.navigate).toHaveBeenCalledWith('ExportKey');
    });
  });
});
