import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import KeycardMenuScreen, {
  dashboardEntry,
} from '../src/screens/KeycardMenuScreen';

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

const navigation = { navigate: jest.fn() } as any;
const route = { key: 'KeycardMenu', name: 'KeycardMenu' } as any;

function renderScreen() {
  return render(<KeycardMenuScreen navigation={navigation} route={route} />);
}

describe('KeycardMenuScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  it('renders the requested submenu items', () => {
    renderScreen();
    expect(screen.getByText('Initialize')).toBeTruthy();
    expect(screen.getByText('Keypair')).toBeTruthy();
    expect(screen.getByText('Secrets')).toBeTruthy();
    expect(screen.getByText('Factory reset')).toBeTruthy();
  });

  it('shows the NFC indicator only for Initialize', () => {
    renderScreen();
    expect(screen.getByTestId('menu-nfc-indicator-0')).toBeTruthy();
    expect(screen.queryByTestId('menu-nfc-indicator-1')).toBeNull();
    expect(screen.queryByTestId('menu-nfc-indicator-2')).toBeNull();
    expect(screen.queryByTestId('menu-nfc-indicator-3')).toBeNull();
  });

  it('renders the NFC indicator with the primary accent color', () => {
    renderScreen();
    expect(screen.getByTestId('menu-nfc-indicator-0').props.color).toBe(
      '#FF6400',
    );
  });

  it('navigates to the expected screens', () => {
    renderScreen();
    for (const [label, destination] of [
      ['Initialize', 'InitCard'],
      ['Keypair', 'KeyPairMenu'],
      ['Secrets', 'SecretsMenu'],
      ['Factory reset', 'FactoryReset'],
    ] as const) {
      fireEvent.press(screen.getByText(label));
      expect(navigation.navigate).toHaveBeenCalledWith(destination);
    }
  });

  describe('dashboardEntry', () => {
    it('has the correct label', () => {
      expect(dashboardEntry.label).toBe('Keycard');
    });

    it('navigates to KeycardMenu when invoked', () => {
      const nav = { navigate: jest.fn() } as any;
      dashboardEntry.navigate(nav);
      expect(nav.navigate).toHaveBeenCalledWith('KeycardMenu');
    });
  });
});
