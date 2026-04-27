import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import GenerateKeyScreen from '../src/screens/keypair/GenerateKeyScreen';
import NFCBottomSheet from '../src/components/NFCBottomSheet';
import { getActivePressables } from './testUtils';

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

jest.mock('@react-native-community/blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('../src/components/NFCBottomSheet', () => jest.fn(() => null));
const MockNFCBottomSheet = NFCBottomSheet as jest.MockedFunction<
  typeof NFCBottomSheet
>;

const mockStart = jest.fn();
const mockCancel = jest.fn();
const mockUseGenerateKey = jest.fn();

jest.mock('../src/hooks/keycard/useGenerateKey', () => ({
  useGenerateKey: () => mockUseGenerateKey(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORDS = [
  'apple',
  'banana',
  'cherry',
  'date',
  'elder',
  'fig',
  'grape',
  'honey',
  'iris',
  'jade',
  'kiwi',
  'lemon',
];

const navigation = {
  goBack: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
} as any;

const route = {
  key: 'GenerateKey',
  name: 'GenerateKey',
  params: { size: 12 },
} as any;

function hookMock(phase: string, result: string[] | null = null) {
  return { phase, status: '', result, start: mockStart, cancel: mockCancel };
}

async function renderScreen(phase = 'idle', result: string[] | null = null) {
  mockUseGenerateKey.mockReturnValue(hookMock(phase, result));
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <GenerateKeyScreen navigation={navigation} route={route} />,
    );
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GenerateKeyScreen', () => {
  beforeEach(() => {
    mockStart.mockClear();
    mockCancel.mockClear();
    MockNFCBottomSheet.mockClear();
    navigation.goBack.mockClear();
    navigation.replace.mockClear();
    navigation.setOptions.mockClear();
  });

  describe('on mount', () => {
    it('calls start() immediately', async () => {
      await renderScreen();
      expect(mockStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('word grid', () => {
    it('does not render the word grid when phase is not done', async () => {
      const renderer = await renderScreen('nfc');
      expect(JSON.stringify(renderer.toJSON())).not.toContain('apple');
    });

    it('renders words when phase is done and result is set', async () => {
      const renderer = await renderScreen('done', WORDS);
      expect(JSON.stringify(renderer.toJSON())).toContain('apple');
      expect(JSON.stringify(renderer.toJSON())).toContain('lemon');
    });

    it('renders a BlurView over the words before revealing', async () => {
      const renderer = await renderScreen('done', WORDS);
      const blur = renderer.root.findAll(
        (node: any) => node.type === 'BlurView',
        { deep: true },
      );
      expect(blur.length).toBeGreaterThan(0);
    });

    it('removes the BlurView after the reveal button is pressed', async () => {
      const renderer = await renderScreen('done', WORDS);
      const pressables = getActivePressables(renderer);
      await act(async () => {
        pressables[0].props.onPress(); // "Reveal recovery phrase"
      });
      const blur = renderer.root.findAll(
        (node: any) => node.type === 'BlurView',
        { deep: true },
      );
      expect(blur.length).toBe(0);
    });
  });

  describe('primary button', () => {
    it('shows "Reveal recovery phrase" before revealing', async () => {
      const renderer = await renderScreen('done', WORDS);
      expect(JSON.stringify(renderer.toJSON())).toContain(
        'Reveal recovery phrase',
      );
    });

    it('shows "Done" after revealing', async () => {
      const renderer = await renderScreen('done', WORDS);
      const pressables = getActivePressables(renderer);
      await act(async () => {
        pressables[0].props.onPress(); // reveal
      });
      expect(JSON.stringify(renderer.toJSON())).toContain('Done');
    });

    it('calls navigation.replace to ConfirmKey when "Done" is pressed', async () => {
      const renderer = await renderScreen('done', WORDS);
      const pressables = getActivePressables(renderer);
      await act(async () => {
        pressables[0].props.onPress(); // reveal
      });
      await act(async () => {
        getActivePressables(renderer)[0].props.onPress(); // done
      });
      expect(navigation.replace).toHaveBeenCalledWith('ConfirmKey', {
        words: WORDS,
      });
    });
  });

  describe('NFCBottomSheet visibility', () => {
    function lastProps() {
      const calls = MockNFCBottomSheet.mock.calls;
      return calls[calls.length - 1][0];
    }

    it('nfc.phase is idle when phase is idle', async () => {
      await renderScreen('idle');
      expect(lastProps().nfc.phase).toBe('idle');
    });

    it('nfc.phase is nfc when phase is nfc', async () => {
      await renderScreen('nfc');
      expect(lastProps().nfc.phase).toBe('nfc');
    });

    it('nfc.phase is error when phase is error', async () => {
      await renderScreen('error');
      expect(lastProps().nfc.phase).toBe('error');
    });

    it('nfc.phase is done when phase is done', async () => {
      await renderScreen('done', WORDS);
      expect(lastProps().nfc.phase).toBe('done');
    });
  });

  describe('cancel', () => {
    it('calls cancel() and navigation.goBack() when NFCBottomSheet cancel is pressed', async () => {
      await renderScreen('nfc');
      const onCancel = MockNFCBottomSheet.mock.calls[0][0].onCancel;
      await act(async () => {
        onCancel();
      });
      expect(mockCancel).toHaveBeenCalledTimes(1);
      expect(navigation.goBack).toHaveBeenCalledTimes(1);
    });
  });
});
