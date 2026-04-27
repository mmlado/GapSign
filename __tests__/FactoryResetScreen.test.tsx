import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import FactoryResetScreen, {
  dashboardEntry,
} from '../src/screens/FactoryResetScreen';
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

jest.mock('../src/components/NFCBottomSheet', () => jest.fn(() => null));
const MockNFCBottomSheet = NFCBottomSheet as jest.MockedFunction<
  typeof NFCBottomSheet
>;

jest.mock('../src/assets/icons', () => ({
  Icons: { nfcActivate: () => null },
}));

const mockStart = jest.fn();
const mockCancel = jest.fn();
const mockReset = jest.fn();
const mockUseFactoryReset = jest.fn();

jest.mock('../src/hooks/keycard/useFactoryReset', () => ({
  useFactoryReset: () => mockUseFactoryReset(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = {
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
} as any;

const route = { key: 'FactoryReset', name: 'FactoryReset' } as any;

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
  mockUseFactoryReset.mockReturnValue(hookMock(phase));
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <FactoryResetScreen navigation={navigation} route={route} />,
    );
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FactoryResetScreen', () => {
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
  // Content when idle
  // -------------------------------------------------------------------------

  describe('idle content', () => {
    it('sets the header title to "Factory reset"', async () => {
      await renderScreen('idle');
      expect(navigation.setOptions).toHaveBeenCalledWith({
        title: 'Factory reset',
      });
    });

    it('shows the warning description', async () => {
      const renderer = await renderScreen('idle');
      expect(JSON.stringify(renderer.toJSON())).toContain(
        'Factory reset permanently erases key pair',
      );
    });

    it('shows the backup checkbox label', async () => {
      const renderer = await renderScreen('idle');
      expect(JSON.stringify(renderer.toJSON())).toContain('I have a backup');
    });

    it('shows the "Factory reset Keycard" button', async () => {
      const renderer = await renderScreen('idle');
      expect(JSON.stringify(renderer.toJSON())).toContain(
        'Factory reset Keycard',
      );
    });

    it('does not show the idle content when not idle', async () => {
      const renderer = await renderScreen('nfc');
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        'Factory reset Keycard',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Button state
  // -------------------------------------------------------------------------

  describe('button state', () => {
    it('the reset button is disabled initially', async () => {
      const renderer = await renderScreen('idle');
      const button = renderer.root.find(
        (node: any) =>
          typeof node.props.onPress === 'function' &&
          node.props.disabled === true,
      );
      expect(button).toBeDefined();
    });

    it('the reset button becomes active after checking the checkbox', async () => {
      const renderer = await renderScreen('idle');

      // Before checking: only the checkbox is active
      expect(getActivePressables(renderer)).toHaveLength(1);

      const checkbox = getActivePressables(renderer)[0];
      await act(async () => {
        checkbox.props.onPress();
      });

      // After checking: more pressables active than before (reset button unlocked)
      expect(getActivePressables(renderer).length).toBeGreaterThan(1);
    });

    it('calls start() when reset button is pressed after checking checkbox', async () => {
      const renderer = await renderScreen('idle');

      const checkbox = getActivePressables(renderer)[0];
      await act(async () => {
        checkbox.props.onPress();
      });

      const activePressables = getActivePressables(renderer);
      // Last pressable is the reset button
      const resetButton = activePressables[activePressables.length - 1];
      await act(async () => {
        resetButton.props.onPress();
      });

      expect(mockStart).toHaveBeenCalledTimes(1);
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
    it('resets to Dashboard with toast when phase is done', async () => {
      await renderScreen('done');
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          { name: 'Dashboard', params: { toast: 'Factory reset done' } },
        ],
      });
    });

    it('does not navigate when phase is not done', async () => {
      await renderScreen('idle');
      expect(navigation.reset).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // dashboardEntry export
  // -------------------------------------------------------------------------

  describe('dashboardEntry', () => {
    it('has the correct label', () => {
      expect(dashboardEntry.label).toBe('Factory reset');
    });

    it('navigates to FactoryReset when invoked', () => {
      const nav = { navigate: jest.fn() } as any;
      dashboardEntry.navigate(nav);
      expect(nav.navigate).toHaveBeenCalledWith('FactoryReset');
    });
  });
});
