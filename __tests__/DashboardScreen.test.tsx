import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Linking } from 'react-native';

import DashboardScreen from '../src/screens/DashboardScreen';

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
    Snackbar: ({ visible, children }: any) =>
      visible ? require('react').createElement(Text, null, children) : null,
  };
});

// Capture the useFocusEffect callback so tests can fire focus events.
let focusCallback: (() => void) | null = null;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    focusCallback = cb;
  },
}));

const mockDashboardActions: { label: string; navigate: (nav: any) => void }[] =
  [];

jest.mock('../src/navigation/dashboardActions', () => ({
  get dashboardActions() {
    return mockDashboardActions;
  },
}));

const mockLoadBooleanPreference = jest.fn();
const mockSaveBooleanPreference = jest.fn();

jest.mock('../src/storage/preferencesStorage', () => ({
  preferenceKeys: {
    dashboardKeycardNoticeDismissed:
      'preference_dashboard_keycard_notice_dismissed',
  },
  loadBooleanPreference: (...args: any[]) => mockLoadBooleanPreference(...args),
  saveBooleanPreference: (...args: any[]) => mockSaveBooleanPreference(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = {
  navigate: jest.fn(),
  setParams: jest.fn(),
} as any;

async function renderScreen(routeParams?: { toast?: string }) {
  focusCallback = null;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const route = routeParams ? { params: routeParams } : ({} as any);
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <DashboardScreen navigation={navigation} route={route as any} />,
    );
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
    navigation.setParams.mockClear();
    mockDashboardActions.length = 0;
    mockLoadBooleanPreference.mockReset();
    mockSaveBooleanPreference.mockReset();
    mockLoadBooleanPreference.mockResolvedValue(true);
    mockSaveBooleanPreference.mockResolvedValue(undefined);
    focusCallback = null;
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('static layout', () => {
    it('renders the Scan transaction button', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain('Scan transaction');
    });

    it('renders one fewer pressable when action list is empty', async () => {
      mockDashboardActions.push({ label: 'Sentinel', navigate: jest.fn() });
      const withOne = await renderScreen();
      const countWithOne = withOne.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        { deep: true },
      ).length;

      mockDashboardActions.length = 0;
      const withNone = await renderScreen();
      const countWithNone = withNone.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        { deep: true },
      ).length;

      expect(countWithNone).toBe(countWithOne - 1);
    });
  });

  describe('action list', () => {
    it('renders items with their labels', async () => {
      mockDashboardActions.push(
        { label: 'Action One', navigate: jest.fn() },
        { label: 'Action Two', navigate: jest.fn() },
      );
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain('Action One');
      expect(JSON.stringify(renderer.toJSON())).toContain('Action Two');
    });

    it('calls the action navigate when an item is pressed', async () => {
      const mockNavigate = jest.fn();
      mockDashboardActions.push({
        label: 'Test Action',
        navigate: mockNavigate,
      });
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        { deep: true },
      );
      // Action item pressables come before the PrimaryButton
      await act(async () => {
        pressables[0].props.onPress();
      });
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
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        { deep: true },
      );
      await act(async () => {
        pressables[1].props.onPress();
      });
      expect(mockSecond).toHaveBeenCalledTimes(1);
      expect(mockFirst).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('navigates to QRScanner when Scan transaction is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        { deep: true },
      );
      // With no actions, the only pressable is the PrimaryButton
      await act(async () => {
        pressables[0].props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('QRScanner');
    });

    it('does not call navigation.navigate when an action item is pressed', async () => {
      mockDashboardActions.push({ label: 'Some Action', navigate: jest.fn() });
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        { deep: true },
      );
      await act(async () => {
        pressables[0].props.onPress();
      });
      expect(navigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('toast / snackbar', () => {
    it('shows the snackbar with the toast message when the screen is focused', async () => {
      const renderer = await renderScreen({ toast: 'Card initialized' });
      await act(async () => {
        focusCallback?.();
      });
      expect(JSON.stringify(renderer.toJSON())).toContain('Card initialized');
    });

    it('clears the toast param after showing the snackbar', async () => {
      await renderScreen({ toast: 'Card initialized' });
      await act(async () => {
        focusCallback?.();
      });
      expect(navigation.setParams).toHaveBeenCalledWith({ toast: undefined });
    });

    it('does not show the snackbar when there is no toast param', async () => {
      const renderer = await renderScreen();
      await act(async () => {
        focusCallback?.();
      });
      expect(navigation.setParams).not.toHaveBeenCalled();
      // Snackbar renders null when not visible — message not in output
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        'Card initialized',
      );
    });
  });

  describe('keycard notice', () => {
    it('shows the notice when it has not been dismissed', async () => {
      mockLoadBooleanPreference.mockResolvedValue(false);
      const renderer = await renderScreen();

      expect(JSON.stringify(renderer.toJSON())).toContain('Keycard required');
      expect(JSON.stringify(renderer.toJSON())).toContain('Buy a Keycard');
      expect(JSON.stringify(renderer.toJSON())).toContain('ShellSummer9746');
      expect(JSON.stringify(renderer.toJSON())).toContain('on purchases over');
      expect(JSON.stringify(renderer.toJSON())).toContain('$25');
    });

    it('hides the notice when it was already dismissed', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        'Keycard required',
      );
    });

    it('opens the purchase link in the browser', async () => {
      mockLoadBooleanPreference.mockResolvedValue(false);
      const renderer = await renderScreen();
      const purchaseLink = renderer.root.find(
        (node: any) => node.props.testID === 'dashboard-keycard-purchase-link',
      );

      await act(async () => {
        purchaseLink.props.onPress();
      });

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://get.keycard.tech/vuxxnf',
      );
    });

    it('dismisses the notice and remembers that choice', async () => {
      mockLoadBooleanPreference.mockResolvedValue(false);
      const renderer = await renderScreen();
      const closeButton = renderer.root.find(
        (node: any) => node.props.testID === 'dashboard-keycard-notice-close',
      );

      await act(async () => {
        closeButton.props.onPress();
      });

      expect(mockSaveBooleanPreference).toHaveBeenCalledWith(
        'preference_dashboard_keycard_notice_dismissed',
        true,
      );
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        'Keycard required',
      );
    });
  });
});
