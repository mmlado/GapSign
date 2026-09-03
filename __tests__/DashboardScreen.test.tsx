import React, { act } from 'react';
import { AppState, Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DashboardScreen from '../src/screens/DashboardScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let lastSnackDuration: number | undefined;

jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return {
    MD3DarkTheme: { colors: {} },
    Text,
    Snackbar: ({ visible, children, duration }: any) => {
      lastSnackDuration = duration;
      return visible ? require('react').createElement(Text, null, children) : null;
    },
  };
});

jest.mock('../src/assets/icons', () => {
  const { View } = require('react-native');
  const Icon = (props: any) => <View {...props} />;
  return {
    Icons: {
      chevronRight: Icon,
      close: Icon,
      nfcActivate: Icon,
      openInBrowser: Icon,
      qr: Icon,
      scan: Icon,
    },
  };
});

// Capture the useFocusEffect callback so tests can fire focus events.
let focusCallback: (() => void) | null = null;
const mockUseNavigationNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    focusCallback = cb;
  },
  useNavigation: () => ({ navigate: mockUseNavigationNavigate }),
}));

const mockDashboardActions: { label: string; navigate: (nav: any) => void }[] =
  [];

jest.mock('../src/navigation/dashboardActions', () => ({
  get dashboardActions() {
    return mockDashboardActions;
  },
}));

jest.mock(
  '../src/components/walletConnect/DashboardCard.online',
  () => () => null,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = {
  navigate: jest.fn(),
  setParams: jest.fn(),
} as any;

// AppState.currentState is a jest.fn() in the RN preset, not a string, so any
// test that depends on foreground state has to set it explicitly.
function setAppState(state: 'active' | 'inactive' | 'background') {
  (AppState as any).currentState = state;
}

async function renderScreen(routeParams?: { toast?: string }) {
  focusCallback = null;
  const route = routeParams ? { params: routeParams } : ({} as any);
  const view = render(
    <DashboardScreen navigation={navigation} route={route as any} />,
  );
  await act(async () => {});
  return view;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
    navigation.setParams.mockClear();
    mockUseNavigationNavigate.mockClear();
    mockDashboardActions.length = 0;
    focusCallback = null;
    // mockImplementation alone leaves call history from earlier tests in place.
    (AppState.addEventListener as jest.Mock).mockClear();
    setAppState('active');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('static layout', () => {
    it('renders the Scan button', async () => {
      await renderScreen();
      expect(screen.getByText('Scan')).toBeTruthy();
    });

    it('renders one fewer pressable when action list is empty', async () => {
      mockDashboardActions.push({ label: 'Sentinel', navigate: jest.fn() });
      await renderScreen();
      expect(screen.getByText('Sentinel')).toBeTruthy();

      mockDashboardActions.length = 0;
      screen.unmount();
      await renderScreen();
      expect(screen.queryByText('Sentinel')).toBeNull();
    });
  });

  describe('action list', () => {
    it('renders items with their labels', async () => {
      mockDashboardActions.push(
        { label: 'Action One', navigate: jest.fn() },
        { label: 'Action Two', navigate: jest.fn() },
      );
      await renderScreen();
      expect(screen.getByText('Action One')).toBeTruthy();
      expect(screen.getByText('Action Two')).toBeTruthy();
    });

    it('calls the action navigate when an item is pressed', async () => {
      const mockNavigate = jest.fn();
      mockDashboardActions.push({
        label: 'Test Action',
        navigate: mockNavigate,
      });
      await renderScreen();
      fireEvent.press(screen.getByText('Test Action'));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(navigation);
    });

    it('only calls the pressed action, not others', async () => {
      const mockFirst = jest.fn();
      const mockSecond = jest.fn();
      mockDashboardActions.push(
        { label: 'First', navigate: mockFirst },
        { label: 'Second', navigate: mockSecond },
      );
      await renderScreen();
      fireEvent.press(screen.getByText('Second'));
      expect(mockSecond).toHaveBeenCalledTimes(1);
      expect(mockFirst).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('navigates to QRScanner when Scan is pressed', async () => {
      await renderScreen();
      fireEvent.press(screen.getByText('Scan'));
      expect(navigation.navigate).toHaveBeenCalledWith('QRScanner');
    });

    it('does not call navigation.navigate when an action item is pressed', async () => {
      mockDashboardActions.push({ label: 'Some Action', navigate: jest.fn() });
      await renderScreen();
      fireEvent.press(screen.getByText('Some Action'));
      expect(navigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('toast / snackbar', () => {
    it('shows the snackbar with the toast message when the screen is focused', async () => {
      await renderScreen({ toast: 'Card initialized' });
      await act(async () => {
        focusCallback?.();
      });
      expect(screen.getByText('Card initialized')).toBeTruthy();
    });

    it('clears the toast param after showing the snackbar', async () => {
      await renderScreen({ toast: 'Card initialized' });
      await act(async () => {
        focusCallback?.();
      });
      expect(navigation.setParams).toHaveBeenCalledWith({ toast: undefined });
    });

    it('does not show the snackbar when there is no toast param', async () => {
      await renderScreen();
      await act(async () => {
        focusCallback?.();
      });
      expect(navigation.setParams).not.toHaveBeenCalled();
      expect(screen.queryByText('Card initialized')).toBeNull();
    });
  });

  // Apple's CoreNFC sheet covers the Snackbar's band for ~3.4 s after a Keycard
  // operation ends. The toast is shown at once and simply outlasts the sheet,
  // so it is revealed as the sheet slides away rather than appearing after it.
  describe('toast vs the iOS NFC sheet', () => {
    const origOS = Platform.OS;

    afterEach(() => {
      Platform.OS = origOS;
    });

    it('outlasts the NFC sheet on iOS', async () => {
      Platform.OS = 'ios';
      await renderScreen({ toast: 'Card name updated' });
      await act(async () => {
        focusCallback?.();
      });
      expect(lastSnackDuration).toBe(7000);
    });

    it('keeps the default duration on Android, which has no system sheet', async () => {
      Platform.OS = 'android';
      await renderScreen({ toast: 'Card name updated' });
      await act(async () => {
        focusCallback?.();
      });
      expect(lastSnackDuration).toBe(3000);
    });

    // Regression: an earlier fix held the toast back until AppState returned to
    // 'active'. iOS posts that only after the sheet's dismissal animation ends,
    // so the toast appeared into an already-empty screen after a visible gap.
    it('shows immediately rather than waiting for the app to become active', async () => {
      Platform.OS = 'ios';
      setAppState('inactive');
      await renderScreen({ toast: 'Card name updated' });
      await act(async () => {
        focusCallback?.();
      });
      expect(screen.getByText('Card name updated')).toBeTruthy();
      expect(AppState.addEventListener).not.toHaveBeenCalled();
    });
  });

  it('does not render the buy-Keycard notice', async () => {
    await renderScreen();
    expect(screen.queryByText('Keycard required')).toBeNull();
    expect(screen.queryByText('Buy a Keycard')).toBeNull();
  });
});
