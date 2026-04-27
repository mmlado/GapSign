import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { getActivePressables } from './testUtils';

import SecretsMenuScreen, {
  dashboardEntry,
} from '../src/screens/secrets/SecretsMenuScreen';

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
const route = { key: 'SecretsMenu', name: 'SecretsMenu' } as any;

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SecretsMenuScreen navigation={navigation} route={route} />,
    );
  });
  return renderer;
}

function extractText(node: any): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.children) return extractText(node.children);
  return '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SecretsMenuScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  describe('layout', () => {
    it('renders "Change PIN" entry', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain('Change PIN');
    });

    it('renders "Change PUK" entry', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain('Change PUK');
    });

    it('renders "Change Pairing Secret" entry', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain(
        'Change Pairing Secret',
      );
    });
  });

  describe('navigation', () => {
    it('navigates to ChangeSecret with pin secretType', async () => {
      const renderer = await renderScreen();
      const entry = getActivePressables(renderer).find(p =>
        extractText(p).includes('Change PIN'),
      );
      await act(async () => {
        entry!.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('ChangeSecret', {
        secretType: 'pin',
      });
    });

    it('navigates to ChangeSecret with puk secretType', async () => {
      const renderer = await renderScreen();
      const entry = getActivePressables(renderer).find(p =>
        extractText(p).includes('Change PUK'),
      );
      await act(async () => {
        entry!.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('ChangeSecret', {
        secretType: 'puk',
      });
    });

    it('navigates to ChangeSecret with pairing secretType', async () => {
      const renderer = await renderScreen();
      const entry = getActivePressables(renderer).find(p =>
        extractText(p).includes('Change Pairing Secret'),
      );
      await act(async () => {
        entry!.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('ChangeSecret', {
        secretType: 'pairing',
      });
    });
  });

  describe('dashboardEntry', () => {
    it('has the correct label', () => {
      expect(dashboardEntry.label).toBe('Secrets');
    });

    it('navigates to SecretsMenu when invoked', () => {
      const nav = { navigate: jest.fn() } as any;
      dashboardEntry.navigate(nav);
      expect(nav.navigate).toHaveBeenCalledWith('SecretsMenu');
    });
  });
});
