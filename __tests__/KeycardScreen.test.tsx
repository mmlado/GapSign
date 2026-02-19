import React, {act} from 'react';
import ReactTestRenderer from 'react-test-renderer';
import KeycardScreen from '../src/screens/KeycardScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-paper', () => {
  const {Text} = require('react-native');
  return {MD3DarkTheme: {colors: {}}, Text};
});

jest.mock('../src/components/NFCBottomSheet', () => () => null);

jest.mock('../src/utils/ethSignature', () => ({
  buildEthSignatureUR: jest.fn(),
}));

const mockSubmitPin = jest.fn();
const mockCancel = jest.fn();
const mockExecute = jest.fn();
const mockUseKeycardOperation = jest.fn();

jest.mock('../src/hooks/useKeycardOperation', () => ({
  useKeycardOperation: () => mockUseKeycardOperation(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = {goBack: jest.fn(), reset: jest.fn()} as any;

const signRoute = {
  params: {
    operation: 'sign',
    signData: 'deadbeef',
    derivationPath: "m/44'/60'/0'/0",
    dataType: 2, // EIP-712 — no keccak needed
    chainId: 1,
    requestId: undefined,
  },
  key: 'Keycard',
  name: 'Keycard',
} as any;

function hookMock(phase: string) {
  return {
    phase,
    status: '',
    result: null,
    execute: mockExecute,
    submitPin: mockSubmitPin,
    cancel: mockCancel,
    reset: jest.fn(),
  };
}

async function renderScreen(phase: string) {
  mockUseKeycardOperation.mockReturnValue(hookMock(phase));
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <KeycardScreen route={signRoute} navigation={navigation} />,
    );
  });
  return renderer;
}

function toJson(r: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(r.toJSON());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KeycardScreen', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockSubmitPin.mockClear();
    mockCancel.mockClear();
  });

  describe('phase-based rendering', () => {
    it('shows PIN pad title when phase is pin_entry', async () => {
      const renderer = await renderScreen('pin_entry');
      expect(toJson(renderer)).toContain('Enter Keycard PIN');
    });

    it('hides PIN pad when phase is nfc', async () => {
      const renderer = await renderScreen('nfc');
      expect(toJson(renderer)).not.toContain('Enter Keycard PIN');
    });

    it('hides PIN pad when phase is idle', async () => {
      const renderer = await renderScreen('idle');
      expect(toJson(renderer)).not.toContain('Enter Keycard PIN');
    });
  });

  describe('on mount', () => {
    it('calls execute for a sign operation', async () => {
      await renderScreen('pin_entry');
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('PIN pad input', () => {
    function getActivePressables(renderer: ReactTestRenderer.ReactTestRenderer) {
      return renderer.root.findAll(
        (node: any) =>
          typeof node.props.onPress === 'function' && !node.props.disabled,
        {deep: true},
      );
    }

    it('does not call submitPin before 6 digits are entered', async () => {
      const renderer = await renderScreen('pin_entry');
      const keys = getActivePressables(renderer);
      // Press '1' five times
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          keys[0].props.onPress();
        });
      }
      expect(mockSubmitPin).not.toHaveBeenCalled();
    });

    it('calls submitPin with the 6-digit PIN on the final press', async () => {
      const renderer = await renderScreen('pin_entry');
      // Press '1' six times (first active key = '1')
      for (let i = 0; i < 6; i++) {
        const keys = getActivePressables(renderer);
        await act(async () => {
          keys[0].props.onPress();
        });
      }
      expect(mockSubmitPin).toHaveBeenCalledTimes(1);
      expect(mockSubmitPin).toHaveBeenCalledWith('111111');
    });

    it('backspace removes the last entered digit', async () => {
      const renderer = await renderScreen('pin_entry');
      // Press '2' (index 1), then backspace, then '1' × 6.
      // If backspace works:   pin goes '' → '111111' → submitPin('111111')
      // If backspace is broken: pin goes '2' → '211111' → submitPin('211111')
      await act(async () => {
        getActivePressables(renderer)[1].props.onPress(); // '2'
      });
      await act(async () => {
        const keys = getActivePressables(renderer);
        keys[keys.length - 1].props.onPress(); // '⌫'
      });
      for (let i = 0; i < 6; i++) {
        const keys = getActivePressables(renderer);
        await act(async () => {
          keys[0].props.onPress(); // '1'
        });
      }
      expect(mockSubmitPin).toHaveBeenCalledWith('111111');
    });
  });
});
