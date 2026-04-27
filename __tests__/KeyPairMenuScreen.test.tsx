import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { getActivePressables } from './testUtils';

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

function extractText(node: any): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.children) return extractText(node.children);
  return '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KeyPairMenuScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  describe('layout', () => {
    it('renders Generate BIP39 before Import BIP39, ahead of SLIP39 entries', async () => {
      const renderer = await renderScreen();
      const json = JSON.stringify(renderer.toJSON());
      expect(json.indexOf('Generate BIP39 key pair')).toBeLessThan(
        json.indexOf('Import BIP39 recovery phrase'),
      );
      expect(json.indexOf('Import BIP39 recovery phrase')).toBeLessThan(
        json.indexOf('Generate SLIP39 shares'),
      );
      expect(json).toContain('Verify BIP39 recovery phrase');
    });

    it('renders SLIP39 menu entries', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain(
        'Generate SLIP39 shares',
      );
      expect(JSON.stringify(renderer.toJSON())).toContain(
        'Import SLIP39 shares',
      );
      expect(JSON.stringify(renderer.toJSON())).toContain(
        'Verify SLIP39 shares',
      );
    });
  });

  describe('navigation', () => {
    it('navigates to Mnemonic when "Import BIP39 recovery phrase" is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      const entry = pressables.find(p =>
        extractText(p).includes('Import BIP39 recovery phrase'),
      );
      await act(async () => {
        entry!.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('Mnemonic');
    });

    it('navigates to Mnemonic with verify mode when "Verify BIP39 recovery phrase" is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      const entry = pressables.find(p =>
        extractText(p).includes('Verify BIP39 recovery phrase'),
      );
      await act(async () => {
        entry!.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('Mnemonic', {
        mode: 'verify',
      });
    });

    it('navigates to KeySize when "Generate BIP39 key pair" is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      const entry = pressables.find(p =>
        extractText(p).includes('Generate BIP39 key pair'),
      );
      await act(async () => {
        entry!.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('KeySize');
    });

    it('navigates to Slip39 generate/import/verify modes', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);

      for (const [label, mode] of [
        ['Generate SLIP39 shares', 'generate'],
        ['Import SLIP39 shares', 'import'],
        ['Verify SLIP39 shares', 'verify'],
      ] as const) {
        const entry = pressables.find(p => extractText(p).includes(label));
        await act(async () => {
          entry!.props.onPress();
        });
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
