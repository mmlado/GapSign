import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = { navigate: jest.fn() } as any;
const route = { key: 'KeyPairMenu', name: 'KeyPairMenu' } as any;

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <KeyPairMenuScreen navigation={navigation} route={route} />,
    );
  });
  return renderer;
}

function toJson(r: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(r.toJSON());
}

function extractText(node: any): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.children) return extractText(node.children);
  return '';
}

function getActivePressables(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    (node: any) =>
      typeof node.props.onPress === 'function' && !node.props.disabled,
    { deep: true },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KeyPairMenuScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  describe('layout', () => {
    it('renders the "Generate new key pair" menu entry', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('Generate new key pair');
    });

    it('renders the "Import recovery phrase" menu entry', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('Import recovery phrase');
    });
  });

  describe('navigation', () => {
    it('navigates to ImportKey when "Import recovery phrase" is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      const entry = pressables.find(p =>
        extractText(p).includes('Import recovery phrase'),
      );
      await act(async () => {
        entry!.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('ImportKey');
    });

    it('navigates to KeySize when "Generate new key pair" is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      const entry = pressables.find(p =>
        extractText(p).includes('Generate new key pair'),
      );
      await act(async () => {
        entry!.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('KeySize');
    });
  });

  describe('dashboardEntry', () => {
    it('has the correct label', () => {
      expect(dashboardEntry.label).toBe('Add Keypair');
    });

    it('navigates to KeyPairMenu when invoked', () => {
      const nav = { navigate: jest.fn() } as any;
      dashboardEntry.navigate(nav);
      expect(nav.navigate).toHaveBeenCalledWith('KeyPairMenu');
    });
  });
});
