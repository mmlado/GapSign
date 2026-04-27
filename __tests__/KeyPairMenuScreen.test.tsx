import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import KeyPairMenuScreen, {
  dashboardEntry,
} from '../src/screens/keypair/KeyPairMenuScreen';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = { navigate: jest.fn() } as any;
const route = { key: 'KeyPairMenu', name: 'KeyPairMenu' } as any;

function renderScreen() {
  return render(<KeyPairMenuScreen navigation={navigation} route={route} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KeyPairMenuScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  describe('layout', () => {
    it('renders Generate BIP39 before Import BIP39, ahead of SLIP39 entries', () => {
      const { toJSON } = renderScreen();
      const rendered = JSON.stringify(toJSON());
      expect(rendered.indexOf('Generate BIP39 key pair')).toBeLessThan(
        rendered.indexOf('Import BIP39 recovery phrase'),
      );
      expect(rendered.indexOf('Import BIP39 recovery phrase')).toBeLessThan(
        rendered.indexOf('Generate SLIP39 shares'),
      );
      expect(screen.getByText('Verify BIP39 recovery phrase')).toBeTruthy();
    });

    it('renders SLIP39 menu entries', () => {
      renderScreen();
      expect(screen.getByText('Generate SLIP39 shares')).toBeTruthy();
      expect(screen.getByText('Import SLIP39 shares')).toBeTruthy();
      expect(screen.getByText('Verify SLIP39 shares')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('navigates to Mnemonic when "Import BIP39 recovery phrase" is pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByText('Import BIP39 recovery phrase'));
      expect(navigation.navigate).toHaveBeenCalledWith('Mnemonic');
    });

    it('navigates to Mnemonic with verify mode when "Verify BIP39 recovery phrase" is pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByText('Verify BIP39 recovery phrase'));
      expect(navigation.navigate).toHaveBeenCalledWith('Mnemonic', {
        mode: 'verify',
      });
    });

    it('navigates to KeySize when "Generate BIP39 key pair" is pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByText('Generate BIP39 key pair'));
      expect(navigation.navigate).toHaveBeenCalledWith('KeySize');
    });

    it('navigates to Slip39 generate/import/verify modes', () => {
      renderScreen();
      for (const [label, mode] of [
        ['Generate SLIP39 shares', 'generate'],
        ['Import SLIP39 shares', 'import'],
        ['Verify SLIP39 shares', 'verify'],
      ] as const) {
        fireEvent.press(screen.getByText(label));
        expect(navigation.navigate).toHaveBeenCalledWith('Slip39', { mode });
      }
    });
  });

  describe('dashboardEntry', () => {
    it('has the correct label', () => {
      expect(dashboardEntry.label).toBe('Keypair');
    });

    it('navigates to KeyPairMenu when invoked', () => {
      const nav = { navigate: jest.fn() } as any;
      dashboardEntry.navigate(nav);
      expect(nav.navigate).toHaveBeenCalledWith('KeyPairMenu');
    });
  });
});
