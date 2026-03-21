import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ConfirmKeyScreen from '../src/screens/keypair/ConfirmKeyScreen';
import NFCBottomSheet from '../src/components/NFCBottomSheet';
import PinPad from '../src/components/PinPad';

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

jest.mock('../src/components/NFCBottomSheet', () => jest.fn(() => null));
const MockNFCBottomSheet = NFCBottomSheet as jest.MockedFunction<
  typeof NFCBottomSheet
>;

jest.mock('../src/components/PinPad', () => jest.fn(() => null));
const MockPinPad = PinPad as jest.MockedFunction<typeof PinPad>;

const mockStart = jest.fn();
const mockCancel = jest.fn();
const mockSubmitPin = jest.fn();
const mockUseLoadKey = jest.fn();

jest.mock('../src/hooks/keycard/useLoadKey', () => ({
  useLoadKey: () => mockUseLoadKey(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// 12 words used as the seed phrase for all tests.
const WORDS = [
  'alpha',
  'bravo',
  'charlie',
  'delta',
  'echo',
  'foxtrot',
  'golf',
  'hotel',
  'india',
  'juliet',
  'kilo',
  'lima',
];

// With Math.random fixed to 0, Fisher-Yates shuffle of [0..11] produces
// [1,2,3,4,5,6,7,8,9,10,11,0]. After .slice(0,4).sort() → [1,2,3,4].
// challengePositions = [1,2,3,4], correct words = bravo, charlie, delta, echo.
const CHALLENGE_POSITIONS = [1, 2, 3, 4];
const CORRECT_WORDS = CHALLENGE_POSITIONS.map(i => WORDS[i]);

// With N_CHOICES=4: choices for slot 0 = ['charlie','delta','echo','bravo'],
// so 'charlie' is a wrong answer for that slot.
// With N_CHOICES=1: only the correct word is shown, so this button won't exist.
const WRONG_WORD_FOR_SLOT_0 = 'charlie';

const navigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  setOptions: jest.fn(),
} as any;

const route = {
  key: 'ConfirmKey',
  name: 'ConfirmKey',
  params: { words: WORDS },
} as any;

function hookMock(phase: string) {
  return {
    phase,
    status: '',
    result: null,
    start: mockStart,
    cancel: mockCancel,
    submitPin: mockSubmitPin,
  };
}

async function renderScreen(phase = 'idle') {
  mockUseLoadKey.mockReturnValue(hookMock(phase));
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ConfirmKeyScreen navigation={navigation} route={route} />,
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

/** Recursively extract all text content from a ReactTestInstance subtree. */
function extractText(node: any): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.children) return extractText(node.children);
  return '';
}

/** Press the choice button whose rendered text matches the given word. */
async function pressChoice(
  renderer: ReactTestRenderer.ReactTestRenderer,
  word: string,
) {
  const pressables = getActivePressables(renderer);
  const btn = pressables.find(p => extractText(p).includes(word));
  if (!btn) throw new Error(`No choice button found for word: "${word}"`);
  await act(async () => {
    btn.props.onPress();
  });
}

/** Complete all N_CHALLENGE correct answers. */
async function completeChallenge(
  renderer: ReactTestRenderer.ReactTestRenderer,
) {
  for (const word of CORRECT_WORDS) {
    await pressChoice(renderer, word);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfirmKeyScreen', () => {
  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    mockStart.mockClear();
    mockCancel.mockClear();
    mockSubmitPin.mockClear();
    MockNFCBottomSheet.mockClear();
    MockPinPad.mockClear();
    navigation.goBack.mockClear();
    navigation.navigate.mockClear();
    navigation.setOptions.mockClear();
  });

  afterEach(() => {
    (Math.random as jest.Mock).mockRestore();
  });

  // -------------------------------------------------------------------------
  // Initial layout
  // -------------------------------------------------------------------------

  describe('initial layout', () => {
    it('sets header title to "Check your backup" when idle', async () => {
      await renderScreen();
      expect(navigation.setOptions).toHaveBeenCalledWith({
        title: 'Check your backup',
      });
    });

    it('shows unfilled slots at start', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('____');
    });

    it('shows choice buttons for the first challenge', async () => {
      const renderer = await renderScreen();
      // With random=0: slot 0 correct word is 'bravo', choices include it
      expect(toJson(renderer)).toContain(CORRECT_WORDS[0]);
    });

    it('hides choices once all answers are filled', async () => {
      const renderer = await renderScreen();
      await completeChallenge(renderer);
      expect(getActivePressables(renderer)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Choice interaction
  // -------------------------------------------------------------------------

  describe('word challenge', () => {
    it('fills the first slot and shows the next choices on correct answer', async () => {
      const renderer = await renderScreen();
      await pressChoice(renderer, CORRECT_WORDS[0]);
      // First slot now shows the word instead of ____
      expect(toJson(renderer)).toContain(CORRECT_WORDS[0]);
      // Second slot's correct word is now available as a choice
      expect(toJson(renderer)).toContain(CORRECT_WORDS[1]);
    });

    it('does not advance when the wrong word is pressed', async () => {
      const renderer = await renderScreen();
      const pressables = getActivePressables(renderer);
      const wrongBtn = pressables.find(p =>
        extractText(p).includes(WRONG_WORD_FOR_SLOT_0),
      );
      if (wrongBtn) {
        await act(async () => {
          wrongBtn.props.onPress();
        });
      }
      expect(toJson(renderer)).toContain('____');
      expect(mockStart).not.toHaveBeenCalled();
    });

    it('calls start() after all correct answers are provided', async () => {
      const renderer = await renderScreen();
      await completeChallenge(renderer);
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it('does not call start() before all answers are filled', async () => {
      const renderer = await renderScreen();
      await pressChoice(renderer, CORRECT_WORDS[0]);
      expect(mockStart).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // PinPad
  // -------------------------------------------------------------------------

  describe('PinPad', () => {
    function lastProps() {
      const calls = MockNFCBottomSheet.mock.calls;
      return calls[calls.length - 1][0];
    }

    it('nfc.phase is not pin_entry when phase is idle', async () => {
      await renderScreen('idle');
      expect(lastProps().nfc.phase).not.toBe('pin_entry');
    });

    it('nfc.phase is pin_entry when phase is pin_entry', async () => {
      await renderScreen('pin_entry');
      expect(lastProps().nfc.phase).toBe('pin_entry');
    });

    it('nfc.submitPin is the submitPin function when phase is pin_entry', async () => {
      await renderScreen('pin_entry');
      expect(lastProps().nfc.submitPin).toBe(mockSubmitPin);
    });
  });

  // -------------------------------------------------------------------------
  // NFCBottomSheet visibility
  // -------------------------------------------------------------------------

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
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  describe('navigation', () => {
    it('navigates to Dashboard with toast when phase is done', async () => {
      await renderScreen('done');
      expect(navigation.navigate).toHaveBeenCalledWith('Dashboard', {
        toast: 'Key pair has been added to Keycard',
      });
    });

    it('does not navigate when phase is not done', async () => {
      await renderScreen('idle');
      expect(navigation.navigate).not.toHaveBeenCalled();
    });

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
