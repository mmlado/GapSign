import React, {act} from 'react';
import ReactTestRenderer from 'react-test-renderer';
import DashboardScreen from '../src/screens/DashboardScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-paper', () => {
  const {Text} = require('react-native');
  return {MD3DarkTheme: {colors: {}}, Text};
});

const mockDashboardActions: {label: string; onPress: () => void}[] = [];

jest.mock('../src/navigation/dashboardActions', () => ({
  get dashboardActions() {
    return mockDashboardActions;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = {navigate: jest.fn()} as any;

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <DashboardScreen navigation={navigation} route={{} as any} />,
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

describe('DashboardScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
    mockDashboardActions.length = 0;
  });

  describe('static layout', () => {
    it('renders the Scan transaction button', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('Scan transaction');
    });

    it('renders no action labels when the list is empty', async () => {
      mockDashboardActions.push({label: 'Sentinel', onPress: jest.fn()});
      const withOne = await renderScreen();
      const countWithOne = withOne.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        {deep: true},
      ).length;

      mockDashboardActions.length = 0;
      const withNone = await renderScreen();
      const countWithNone = withNone.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        {deep: true},
      ).length;

      expect(countWithNone).toBe(countWithOne - 1);
    });
  });

  describe('action list', () => {
    it('renders items with their labels', async () => {
      mockDashboardActions.push(
        {label: 'Action One', onPress: jest.fn()},
        {label: 'Action Two', onPress: jest.fn()},
      );
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('Action One');
      expect(toJson(renderer)).toContain('Action Two');
    });

    it('calls the action onPress when an item is pressed', async () => {
      const mockOnPress = jest.fn();
      mockDashboardActions.push({label: 'Test Action', onPress: mockOnPress});
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        {deep: true},
      );
      // Action item pressables come before the PrimaryButton
      await act(async () => {
        pressables[0].props.onPress();
      });
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('only calls the pressed action, not others', async () => {
      const mockFirst = jest.fn();
      const mockSecond = jest.fn();
      mockDashboardActions.push(
        {label: 'First', onPress: mockFirst},
        {label: 'Second', onPress: mockSecond},
      );
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        {deep: true},
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
        {deep: true},
      );
      // With no actions, the only pressable is the PrimaryButton
      await act(async () => {
        pressables[0].props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('QRScanner');
    });

    it('does not navigate when an action item is pressed', async () => {
      mockDashboardActions.push({label: 'Some Action', onPress: jest.fn()});
      const renderer = await renderScreen();
      const pressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        {deep: true},
      );
      await act(async () => {
        pressables[0].props.onPress();
      });
      expect(navigation.navigate).not.toHaveBeenCalled();
    });
  });
});
