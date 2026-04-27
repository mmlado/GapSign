import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

import AboutScreen from '../src/screens/AboutScreen';

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

const navigation = {
  navigate: jest.fn(),
} as any;

function renderScreen() {
  return render(<AboutScreen navigation={navigation} route={{} as any} />);
}

describe('AboutScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the app, Keycard, contributors, and license sections', () => {
    renderScreen();
    expect(screen.getAllByText('GapSign').length).toBeGreaterThan(0);
    expect(screen.getByText(/Keycard required/)).toBeTruthy();
    expect(screen.getByText('Mladen Milankovic')).toBeTruthy();
    expect(screen.getByText('Open-source licenses')).toBeTruthy();
  });

  it('opens contributor GitHub profiles', () => {
    renderScreen();
    fireEvent.press(screen.getByText('Mladen Milankovic'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://github.com/mmlado');
  });

  it('navigates to license details from a license row', () => {
    renderScreen();
    fireEvent.press(screen.getByText('@ethereumjs/rlp'));
    expect(navigation.navigate).toHaveBeenCalledWith('LicenseDetail', {
      packageName: '@ethereumjs/rlp',
      licenseType: 'MPL-2.0',
    });
  });
});
