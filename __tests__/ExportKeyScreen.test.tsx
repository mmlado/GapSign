import React, {act} from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ExportKeyScreen, {dashboardEntry} from '../src/screens/ExportKeyScreen';

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

// ExportKeyScreen imports dashboardActions for border-style calculation.
jest.mock('../src/navigation/dashboardActions', () => ({
  dashboardActions: [{label: 'Connect software wallet', navigate: jest.fn()}],
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = {navigate: jest.fn()} as any;

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ExportKeyScreen
        navigation={navigation}
        route={{key: 'ExportKey', name: 'ExportKey'} as any}
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
  });

  describe('navigation', () => {
    it('navigates to Keycard with export_key operation when Ethereum is pressed', async () => {
      const renderer = await renderScreen();
      const pressable = renderer.root.find(
        (node: any) => typeof node.props.onPress === 'function',
      );
      await act(async () => {
        pressable.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('Keycard', {
        operation: 'export_key',
        derivationPath: "m/44'/60'/0'",
      });
    });
  });

  describe('dashboardEntry', () => {
    it('has label "Connect software wallet"', () => {
      expect(dashboardEntry.label).toBe('Connect software wallet');
    });

    it('calls navigation.navigate("ExportKey") when invoked', () => {
      const nav = {navigate: jest.fn()} as any;
      dashboardEntry.navigate(nav);
      expect(nav.navigate).toHaveBeenCalledWith('ExportKey');
    });
  });
});
