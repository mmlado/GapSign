import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import KeySizeScreen from '../src/screens/keypair/KeySizeScreen';

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
const route = { key: 'KeySize', name: 'KeySize' } as any;

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <KeySizeScreen navigation={navigation} route={route} />,
    );
  });
  return renderer;
}

function toJson(r: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(r.toJSON());
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

describe('KeySizeScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
  });

  describe('layout', () => {
    it('renders the "12 word" option', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('12 word');
    });

    it('renders the "24 word" option', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('24 word');
    });
  });

  describe('navigation', () => {
    it('navigates to GenerateKey with size 12 when "12 word" is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      await act(async () => {
        pressables[0].props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('GenerateKey', {
        size: 12,
      });
    });

    it('navigates to GenerateKey with size 24 when "24 word" is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      await act(async () => {
        pressables[1].props.onPress();
      });
      expect(navigation.navigate).toHaveBeenCalledWith('GenerateKey', {
        size: 24,
      });
    });
  });
});
