import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import GenerateKeyScreen from '../src/screens/keypair/GenerateKeyScreen';
import NFCBottomSheet from '../src/components/NFCBottomSheet';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../src/hooks/useSeedReviewTimer', () => ({
  useSeedReviewTimer: jest.fn(),
}));
const useSeedReviewTimerMock = require('../src/hooks/useSeedReviewTimer')
  .useSeedReviewTimer as jest.Mock;

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
  navigate: jest.fn(),
  setOptions: jest.fn(),
} as any;

const route = (withPassphrase = false) =>
  ({
    key: 'GenerateKey',
    name: 'GenerateKey',
    params: { size: 12, passphrase: withPassphrase },
  } as any);

function hookMock(phase: string, result: string[] | null = null) {
  return { phase, status: '', result, start: mockStart, cancel: mockCancel };
}

function renderScreen(
  phase = 'idle',
  result: string[] | null = null,
  timer: { timeLeft: number; done: boolean; start: jest.Mock } = {
    timeLeft: 0,
    done: true,
    start: jest.fn(),
  },
) {
  useSeedReviewTimerMock.mockReturnValue(timer);
  mockUseGenerateKey.mockReturnValue(hookMock(phase, result));
  return render(<GenerateKeyScreen navigation={navigation} route={route()} />);
}

function renderScreenWithPassphrase(
  phase = 'done',
  result: string[] | null = WORDS,
  timer: { timeLeft: number; done: boolean; start: jest.Mock } = {
    timeLeft: 0,
    done: true,
    start: jest.fn(),
  },
) {
  useSeedReviewTimerMock.mockReturnValue(timer);
  mockUseGenerateKey.mockReturnValue(hookMock(phase, result));
  return render(
    <GenerateKeyScreen navigation={navigation} route={route(true)} />,
  );
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
    navigation.navigate.mockClear();
    navigation.setOptions.mockClear();
    useSeedReviewTimerMock.mockClear();
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
      expect(screen.UNSAFE_queryAllByType('BlurView' as any)).toHaveLength(1);
    });

    it('removes the BlurView after the reveal button is pressed', async () => {
      renderScreen('done', WORDS);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      expect(screen.UNSAFE_queryAllByType('BlurView' as any)).toHaveLength(0);
    });
  });

  describe('primary button', () => {
    it('shows "Reveal recovery phrase" before revealing', () => {
      renderScreen('done', WORDS);
      expect(screen.getByText('Reveal recovery phrase')).toBeTruthy();
    });

    it('shows "I\'ve written it down" after revealing', async () => {
      renderScreen('done', WORDS);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      expect(screen.getByText("I've written it down")).toBeTruthy();
    });

    it('calls navigation.navigate to ConfirmKey when "I\'ve written it down" is pressed', async () => {
      renderScreen('done', WORDS);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText("I've written it down"));
      });
      expect(navigation.navigate).toHaveBeenCalledWith('ConfirmKey', {
        words: WORDS,
      });
    });

    it('passes passphrase to ConfirmKey when withPassphrase is true', async () => {
      const timer = { timeLeft: 0, done: true, start: jest.fn() };
      renderScreenWithPassphrase('done', WORDS, timer);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      const passphraseInput = screen.getByPlaceholderText('Enter passphrase');
      fireEvent.changeText(passphraseInput, 'test-pass');
      await act(async () => {
        fireEvent.press(screen.getByText("I've written it down"));
      });
      expect(navigation.navigate).toHaveBeenCalledWith('ConfirmKey', {
        words: WORDS,
        passphrase: 'test-pass',
      });
    });

    it('disables button while timer is running', async () => {
      const timer = { timeLeft: 15, done: false, start: jest.fn() };
      renderScreen('done', WORDS, timer);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      const btn = screen.getByTestId('primary-button');
      expect(btn?.props?.accessibilityState?.disabled).toBe(true);
    });

    it('enables button after timer completes', async () => {
      const timer = { timeLeft: 0, done: true, start: jest.fn() };
      renderScreen('done', WORDS, timer);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      const btn = screen.getByTestId('primary-button');
      expect(btn?.props?.accessibilityState?.disabled).toBe(false);
    });

    it('disables button when passphrase is required but empty', async () => {
      const timer = { timeLeft: 0, done: true, start: jest.fn() };
      renderScreenWithPassphrase('done', WORDS, timer);
      await act(async () => {
        fireEvent.press(screen.getByText('Reveal recovery phrase'));
      });
      const btn = screen.getByTestId('primary-button');
      expect(btn?.props?.accessibilityState?.disabled).toBe(true);
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
