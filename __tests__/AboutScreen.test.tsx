import React, { act } from 'react';
import { Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

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

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AboutScreen navigation={navigation} route={{} as any} />,
    );
  });

  return renderer;
}

function findText(renderer: ReactTestRenderer.ReactTestRenderer, text: string) {
  return renderer.root.findAll(
    (node: any) => node.type === 'Text' && node.props.children === text,
  )[0];
}

function findNearestPressable(node: ReactTestRenderer.ReactTestInstance) {
  let current: ReactTestRenderer.ReactTestInstance | null = node;

  while (current) {
    if (typeof current.props.onPress === 'function') {
      return current;
    }
    current = current.parent;
  }

  throw new Error('No pressable parent found');
}

describe('AboutScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the app, Keycard, contributors, and license sections', async () => {
    const renderer = await renderScreen();

    expect(JSON.stringify(renderer.toJSON())).toContain('GapSign');
    expect(JSON.stringify(renderer.toJSON())).toContain('Keycard required');
    expect(JSON.stringify(renderer.toJSON())).toContain('Mladen Milankovic');
    expect(JSON.stringify(renderer.toJSON())).toContain('Open-source licenses');
  });

  it('opens contributor GitHub profiles', async () => {
    const renderer = await renderScreen();
    const contributor = findText(renderer, 'Mladen Milankovic');
    const pressable = findNearestPressable(contributor);

    await act(async () => {
      pressable.props.onPress();
    });

    expect(Linking.openURL).toHaveBeenCalledWith('https://github.com/mmlado');
  });

  it('navigates to license details from a license row', async () => {
    const renderer = await renderScreen();
    const packageName = findText(renderer, '@ethereumjs/rlp');
    const pressable = findNearestPressable(packageName);

    await act(async () => {
      pressable.props.onPress();
    });

    expect(navigation.navigate).toHaveBeenCalledWith('LicenseDetail', {
      packageName: '@ethereumjs/rlp',
      licenseType: 'MPL-2.0',
    });
  });
});
