import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import GenerateKeyScreen from '../src/screens/keypair/GenerateKeyScreen';
import NFCBottomSheet from '../src/components/NFCBottomSheet';

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

function renderScreen(phase = 'idle', result: string[] | null = null) {
  mockUseGenerateKey.mockReturnValue(hookMock(phase, result));
  return render(<GenerateKeyScreen navigation={navigation} route={route} />);
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
      renderScreen();
      expect(mockStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('word grid', () => {
    it('does not render the word grid when phase is not done', () => {
      renderScreen('nfc');
      expect(screen.queryByText('apple')).toBeNull();
    });

    it('renders words when phase is done and result is set', () => {
      renderScreen('done', WORDS);
      expect(screen.getByText('apple')).toBeTruthy();
      expect(screen.getByText('lemon')).toBeTruthy();
    });

    it('renders a BlurView over the words before revealing', () => {
      renderScreen('done', WORDS);
      expect(screen.UNSAFE_queryAllByType('BlurView')).toHaveLength(1);
    });

    it('removes the BlurView after the reveal button is pressed', async () => {
      renderScreen('done', WORDS);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      expect(screen.UNSAFE_queryAllByType('BlurView')).toHaveLength(0);
    });
  });

  describe('primary button', () => {
    it('shows "Reveal recovery phrase" before revealing', () => {
      renderScreen('done', WORDS);
      expect(screen.getByText('Reveal recovery phrase')).toBeTruthy();
    });

    it('shows "Done" after revealing', async () => {
      renderScreen('done', WORDS);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      expect(screen.getByText('Done')).toBeTruthy();
    });

    it('calls navigation.replace to ConfirmKey when "Done" is pressed', async () => {
      renderScreen('done', WORDS);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Done'));
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

    it('nfc.phase is idle when phase is idle', () => {
      renderScreen('idle');
      expect(lastProps().nfc.phase).toBe('idle');
    });

    it('nfc.phase is nfc when phase is nfc', () => {
      renderScreen('nfc');
      expect(lastProps().nfc.phase).toBe('nfc');
    });

    it('nfc.phase is error when phase is error', () => {
      renderScreen('error');
      expect(lastProps().nfc.phase).toBe('error');
    });

    it('nfc.phase is done when phase is done', () => {
      renderScreen('done', WORDS);
      expect(lastProps().nfc.phase).toBe('done');
    });
  });

  describe('cancel', () => {
    it('calls cancel() and navigation.goBack() when NFCBottomSheet cancel is pressed', async () => {
      renderScreen('nfc');
      const onCancel = MockNFCBottomSheet.mock.calls[0][0].onCancel;
      await act(async () => {
        onCancel();
      });
      expect(mockCancel).toHaveBeenCalledTimes(1);
      expect(navigation.goBack).toHaveBeenCalledTimes(1);
    });
  });
});
