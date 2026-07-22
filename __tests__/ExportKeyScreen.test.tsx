import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

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
      close: Icon,
      nfcActivate: Icon,
    },
  };
});

const mockLoadXpubNoticeDismissed = jest.fn();
const mockSaveXpubNoticeDismissed = jest.fn();
jest.mock('../src/storage/preferencesStorage', () => ({
  loadXpubNoticeDismissed: (...args: unknown[]) =>
    mockLoadXpubNoticeDismissed(...args),
  saveXpubNoticeDismissed: (...args: unknown[]) =>
    mockSaveXpubNoticeDismissed(...args),
}));

// ExportKeyScreen imports dashboardActions for border-style calculation.
jest.mock('../src/navigation/dashboardActions', () => ({
  dashboardActions: [{ label: 'Connect software wallet', navigate: jest.fn() }],
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = { navigate: jest.fn() } as any;

function renderScreenRaw() {
  return render(
    <ExportKeyScreen
      navigation={navigation}
      route={{ key: 'ExportKey', name: 'ExportKey' } as any}
    />,
  );
}

// Renders and waits for the async xpub-notice preference load to settle.
async function renderScreen() {
  const result = renderScreenRaw();
  await screen.findByText(/extended public key \(xpub\)/);
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExportKeyScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
    mockLoadXpubNoticeDismissed.mockReset().mockResolvedValue(false);
    mockSaveXpubNoticeDismissed.mockReset().mockResolvedValue(undefined);
  });

  describe('layout', () => {
    it('renders without crashing', async () => {
      expect(await renderScreen()).toBeDefined();
    });

    it('renders the Ethereum option', async () => {
      await renderScreen();
      expect(screen.getByText('Ethereum')).toBeTruthy();
    });

    it('explains the extended public key and its privacy caveat', async () => {
      await renderScreen();
      expect(screen.getByText(/extended public key \(xpub\)/)).toBeTruthy();
      expect(screen.getByText(/cannot spend/)).toBeTruthy();
    });

    it('does not show the xpub notice when it was previously dismissed', async () => {
      mockLoadXpubNoticeDismissed.mockResolvedValue(true);
      renderScreenRaw();
      await waitFor(() =>
        expect(mockLoadXpubNoticeDismissed).toHaveBeenCalled(),
      );
      expect(screen.queryByText(/extended public key \(xpub\)/)).toBeNull();
    });

    it('hides the xpub notice and persists dismissal when the close button is pressed', async () => {
      await renderScreen();

      fireEvent.press(screen.getByTestId('xpub-notice-close'));

      expect(screen.queryByText(/extended public key \(xpub\)/)).toBeNull();
      expect(mockSaveXpubNoticeDismissed).toHaveBeenCalledWith(true);
    });

    it('shows the NFC indicator for every export option', async () => {
      await renderScreen();

      for (const index of [0, 1, 2, 3, 4, 5, 6]) {
        expect(screen.getByTestId(`menu-nfc-indicator-${index}`)).toBeTruthy();
      }
    });
  });

  describe('navigation', () => {
    it('navigates to Keycard with export_key operation when Ethereum is pressed', async () => {
      await renderScreen();
      fireEvent.press(screen.getByText('Ethereum'));
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
        source: 'account.standard',
      });
    });

    it('navigates to Keycard with Bitcoin export path when Bitcoin is pressed', async () => {
      await renderScreen();
      fireEvent.press(screen.getByText('Bitcoin'));
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/84'/0'/0'",
      });
    });

    it('navigates to Keycard with multisig export path when Bitcoin Multisig is pressed', async () => {
      await renderScreen();
      fireEvent.press(screen.getByText('Bitcoin Multisig'));
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/48'/0'/0'/2'",
      });
    });

    it('navigates to Keycard with testnet export path when Bitcoin Testnet is pressed', async () => {
      await renderScreen();
      fireEvent.press(screen.getByText('Bitcoin Testnet'));
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/84'/1'/0'",
      });
    });

    it('navigates to Keycard with source "account.ledger_live" when Ledger Live is pressed', async () => {
      await renderScreen();
      fireEvent.press(screen.getByText('Ledger Live'));
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
        source: 'account.ledger_live',
      });
    });

    it('navigates to Keycard with source "account.ledger_legacy" when Ledger Legacy is pressed', async () => {
      await renderScreen();
      fireEvent.press(screen.getByText('Ledger Legacy'));
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
        source: 'account.ledger_legacy',
      });
    });

    it('navigates to Keycard with derivationPath "bitget" when Bitget is pressed', async () => {
      await renderScreen();
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
