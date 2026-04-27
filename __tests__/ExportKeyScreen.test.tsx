import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

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

jest.mock('../src/assets/icons', () => {
  const { View } = require('react-native');
  const Icon = (props: any) => <View {...props} />;
  return {
    Icons: {
      chevronRight: Icon,
      nfcActivate: Icon,
    },
  };
});

// ExportKeyScreen imports dashboardActions for border-style calculation.
jest.mock('../src/navigation/dashboardActions', () => ({
  dashboardActions: [{ label: 'Connect software wallet', navigate: jest.fn() }],
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = { navigate: jest.fn() } as any;

function renderScreen() {
  return render(
    <ExportKeyScreen
      navigation={navigation}
      route={{ key: 'ExportKey', name: 'ExportKey' } as any}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExportKeyScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  describe('layout', () => {
    it('renders without crashing', () => {
      expect(renderScreen()).toBeDefined();
    });

    it('renders the Ethereum option', () => {
      renderScreen();
      expect(screen.getByText('Ethereum')).toBeTruthy();
    });

    it('shows the NFC indicator for every export option', () => {
      renderScreen();

      for (const index of [0, 1, 2, 3, 4, 5, 6]) {
        expect(screen.getByTestId(`menu-nfc-indicator-${index}`)).toBeTruthy();
      }
    });
  });

  describe('navigation', () => {
    it('navigates to Keycard with export_key operation when Ethereum is pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByText('Ethereum'));
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
      });
    });

    it('navigates to Keycard with source "account.ledger_live" when Ledger Live is pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByText('Ledger Live'));
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
        source: 'account.ledger_live',
      });
    });

    it('navigates to Keycard with source "account.ledger_legacy" when Ledger Legacy is pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByText('Ledger Legacy'));
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
        source: 'account.ledger_legacy',
      });
    });

    it('navigates to Keycard with derivationPath "bitget" when Bitget is pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByText('Bitget'));
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
