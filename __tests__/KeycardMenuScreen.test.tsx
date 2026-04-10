import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

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

const navigation = { navigate: jest.fn() } as any;
const route = { key: 'KeycardMenu', name: 'KeycardMenu' } as any;

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <KeycardMenuScreen navigation={navigation} route={route} />,
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

describe('KeycardMenuScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  it('renders the requested submenu items', async () => {
    const renderer = await renderScreen();
    const json = toJson(renderer);

    expect(json).toContain('Initialize');
    expect(json).toContain('Keypair');
    expect(json).toContain('Secrets');
    expect(json).toContain('Factory reset');
  });

  it('shows the NFC indicator only for Initialize', async () => {
    const renderer = await renderScreen();

    expect(
      renderer.root.findAll(
        (node: any) => node.props.testID === 'menu-nfc-indicator-0',
      ),
    ).toHaveLength(1);
    expect(
      renderer.root.findAll(
        (node: any) => node.props.testID === 'menu-nfc-indicator-1',
      ),
    ).toHaveLength(0);
    expect(
      renderer.root.findAll(
        (node: any) => node.props.testID === 'menu-nfc-indicator-2',
      ),
    ).toHaveLength(0);
    expect(
      renderer.root.findAll(
        (node: any) => node.props.testID === 'menu-nfc-indicator-3',
      ),
    ).toHaveLength(0);
  });

  it('renders the NFC indicator with the primary accent color', async () => {
    const renderer = await renderScreen();
    const indicators = renderer.root.findAll(
      (node: any) => node.props.testID === 'menu-nfc-indicator-0',
    );

    expect(indicators).toHaveLength(1);
    expect(indicators[0].props.color).toBe('#FF6400');
  });

  it('navigates to the expected screens', async () => {
    const renderer = await renderScreen();
    const pressables = getActivePressables(renderer);

    for (const [label, screen] of [
      ['Initialize', 'InitCard'],
      ['Keypair', 'KeyPairMenu'],
      ['Secrets', 'SecretsMenu'],
      ['Factory reset', 'FactoryReset'],
    ] as const) {
      const entry = pressables.find(p => extractText(p).includes(label));
      await act(async () => {
        entry!.props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith(screen);
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
