import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import InitCardScreen, { dashboardEntry } from '../src/screens/InitCardScreen';
import NFCBottomSheet from '../src/components/NFCBottomSheet';
import { getActivePressables, findKey } from './testUtils';

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

// useFocusEffect is used only to register the hardware-back handler.
// In tests there's no focus management so we make it a no-op.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const mockStart = jest.fn();
const mockCancel = jest.fn();
const mockReset = jest.fn();
const mockUseInitCard = jest.fn();

jest.mock('../src/hooks/keycard/useInitCard', () => ({
  useInitCard: () => mockUseInitCard(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = {
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
} as any;

const route = { key: 'InitCard', name: 'InitCard' } as any;

function hookMock(phase: string) {
  return {
    phase,
    status: '',
    result: null,
    start: mockStart,
    cancel: mockCancel,
    reset: mockReset,
  };
}

async function renderScreen(phase = 'idle') {
  mockUseInitCard.mockReturnValue(hookMock(phase));
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <InitCardScreen navigation={navigation} route={route} />,
    );
  });
  return renderer;
}

/** Press a digit key six times to complete a full PIN entry. keyIndex 0 = '1', 1 = '2'. */
async function enterPin(
  renderer: ReactTestRenderer.ReactTestRenderer,
  keyIndex = 0,
) {
  const digit = String(keyIndex + 1);
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      findKey(renderer, digit).props.onPress();
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InitCardScreen', () => {
  beforeEach(() => {
    mockStart.mockClear();
    mockCancel.mockClear();
    mockReset.mockClear();
    MockNFCBottomSheet.mockClear();
    navigation.goBack.mockClear();
    navigation.reset.mockClear();
    navigation.setOptions.mockClear();
  });

  // -------------------------------------------------------------------------
  // Static
  // -------------------------------------------------------------------------

  describe('initial render', () => {
    it('sets header title to "Create a PIN" on first render', async () => {
      await renderScreen();
      expect(navigation.setOptions).toHaveBeenCalledWith({
        title: 'Create a PIN',
      });
    });

    it('shows the PIN pad on first render', async () => {
      const renderer = await renderScreen();
      expect(JSON.stringify(renderer.toJSON())).toContain('6 digits');
    });
  });

  // -------------------------------------------------------------------------
  // Step transitions
  // -------------------------------------------------------------------------

  describe('step transitions', () => {
    it('moves to pin_confirm after 6 digits are entered', async () => {
      const renderer = await renderScreen();
      navigation.setOptions.mockClear();
      await enterPin(renderer, 0); // '1' × 6
      expect(navigation.setOptions).toHaveBeenCalledWith({
        title: 'Confirm your PIN',
      });
    });

    it('moves to duress_question after the PIN is confirmed correctly', async () => {
      const renderer = await renderScreen();
      await enterPin(renderer, 0); // PIN: '111111'
      await enterPin(renderer, 0); // confirm same PIN
      expect(JSON.stringify(renderer.toJSON())).toContain('Add a duress PIN?');
    });

    it('shows an error when the confirmed PIN does not match', async () => {
      const renderer = await renderScreen();
      await enterPin(renderer, 0); // PIN: '111111'
      await enterPin(renderer, 1); // confirm: '222222' — mismatch
      expect(JSON.stringify(renderer.toJSON())).toContain("PINs don't match");
    });

    it('stays on pin_confirm after a mismatch (does not advance)', async () => {
      const renderer = await renderScreen();
      navigation.setOptions.mockClear();
      await enterPin(renderer, 0); // PIN
      await enterPin(renderer, 1); // wrong confirm
      // Title remains 'Confirm your PIN' (no advancement to duress_question)
      expect(navigation.setOptions).not.toHaveBeenCalledWith({
        title: 'Initialize Card',
      });
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        'Add a duress PIN?',
      );
    });
  });

  // -------------------------------------------------------------------------
  // ConfirmPrompt callbacks
  // -------------------------------------------------------------------------

  describe('duress question', () => {
    async function reachConfirmPrompt() {
      const renderer = await renderScreen();
      await enterPin(renderer, 0); // PIN: '111111'
      await enterPin(renderer, 0); // confirm: '111111'
      return renderer;
    }

    it('calls start with the PIN and null duress when No is pressed', async () => {
      const renderer = await reachConfirmPrompt();
      // 'No, skip' is the second pressable in ConfirmPrompt
      const pressables = getActivePressables(renderer);
      await act(async () => {
        pressables[pressables.length - 1].props.onPress(); // 'No, skip'
      });
      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(mockStart).toHaveBeenCalledWith('111111', null);
    });

    it('moves to duress_entry when Yes is pressed', async () => {
      const renderer = await reachConfirmPrompt();
      navigation.setOptions.mockClear();
      const pressables = getActivePressables(renderer);
      await act(async () => {
        pressables[0].props.onPress(); // PrimaryButton(Yes) = index 0
      });
      expect(navigation.setOptions).toHaveBeenCalledWith({
        title: 'Create a duress PIN',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Duress PIN entry
  // -------------------------------------------------------------------------

  describe('duress PIN entry', () => {
    async function reachDuressEntry() {
      const renderer = await renderScreen();
      await enterPin(renderer, 0); // PIN: '111111'
      await enterPin(renderer, 0); // confirm: '111111'
      // press 'Yes, add duress PIN' — PrimaryButton(Yes) is index 0
      const pressables = getActivePressables(renderer);
      await act(async () => {
        pressables[0].props.onPress();
      });
      return renderer;
    }

    it('moves to duress_confirm after 6 duress digits', async () => {
      const renderer = await reachDuressEntry();
      navigation.setOptions.mockClear();
      await enterPin(renderer, 1); // duress: '222222'
      expect(navigation.setOptions).toHaveBeenCalledWith({
        title: 'Confirm duress PIN',
      });
    });

    it('calls start with PIN and duress when duress confirm matches', async () => {
      const renderer = await reachDuressEntry();
      await enterPin(renderer, 1); // duress: '222222'
      await enterPin(renderer, 1); // duress confirm: '222222'
      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(mockStart).toHaveBeenCalledWith('111111', '222222');
    });

    it('shows an error when duress confirm does not match', async () => {
      const renderer = await reachDuressEntry();
      await enterPin(renderer, 1); // duress: '222222'
      await enterPin(renderer, 0); // duress confirm: '111111' — mismatch
      expect(JSON.stringify(renderer.toJSON())).toContain("PINs don't match");
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

    it('nfc.phase is done and showOnDone is true when phase is done', async () => {
      await renderScreen('done');
      expect(lastProps().nfc.phase).toBe('done');
      expect(lastProps().showOnDone).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Navigation after done
  // -------------------------------------------------------------------------

  describe('navigation', () => {
    it('navigates to Dashboard when phase is done and result is set', async () => {
      mockUseInitCard.mockReturnValue({
        ...hookMock('done'),
        result: '123456789012',
      });
      await act(async () => {
        ReactTestRenderer.create(
          <InitCardScreen navigation={navigation} route={route} />,
        );
      });
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Dashboard', params: { toast: 'Card initialized' } }],
      });
    });

    it('does not navigate when phase is done but result is null', async () => {
      await renderScreen('done'); // result is null in hookMock
      expect(navigation.reset).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // dashboardEntry export
  // -------------------------------------------------------------------------

  describe('dashboardEntry', () => {
    it('has the correct label', () => {
      expect(dashboardEntry.label).toBe('Initialize');
    });

    it('navigates to InitCard when invoked', () => {
      const nav = { navigate: jest.fn() } as any;
      dashboardEntry.navigate(nav);
      expect(nav.navigate).toHaveBeenCalledWith('InitCard');
    });
  });
});
