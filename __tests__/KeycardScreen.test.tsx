import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import KeycardScreen from '../src/screens/KeycardScreen';
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

jest.mock('../src/components/NFCBottomSheet', () => jest.fn(() => null));
const MockNFCBottomSheet = NFCBottomSheet as jest.MockedFunction<
  typeof NFCBottomSheet
>;

jest.mock('../src/utils/ethSignature', () => ({
  buildEthSignatureUR: jest.fn(),
}));

const mockSubmitPin = jest.fn();
const mockCancel = jest.fn();
const mockExecute = jest.fn();
const mockUseKeycardOperation = jest.fn();

jest.mock('../src/hooks/keycard/useKeycardOperation', () => ({
  useKeycardOperation: () => mockUseKeycardOperation(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navigation = {
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
} as any;

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KeycardScreen', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockSubmitPin.mockClear();
    mockCancel.mockClear();
    MockNFCBottomSheet.mockClear();
    navigation.setOptions.mockClear();
  });

  describe('phase-based rendering', () => {
    it('sets header title to "Enter Keycard PIN"', async () => {
      await renderScreen('pin_entry');
      expect(navigation.setOptions).toHaveBeenCalledWith({
        title: 'Enter Keycard PIN',
      });
    });

    it('nfc.phase is pin_entry when phase is pin_entry', async () => {
      await renderScreen('pin_entry');
      const calls = MockNFCBottomSheet.mock.calls;
      const props = calls[calls.length - 1][0];
      expect(props.nfc.phase).toBe('pin_entry');
    });

    it('nfc.phase is nfc when phase is nfc', async () => {
      await renderScreen('nfc');
      const calls = MockNFCBottomSheet.mock.calls;
      const props = calls[calls.length - 1][0];
      expect(props.nfc.phase).toBe('nfc');
    });

    it('nfc.phase is idle when phase is idle', async () => {
      await renderScreen('idle');
      const calls = MockNFCBottomSheet.mock.calls;
      const props = calls[calls.length - 1][0];
      expect(props.nfc.phase).toBe('idle');
    });
  });

  describe('on mount', () => {
    it('calls execute for a sign operation', async () => {
      await renderScreen('pin_entry');
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('NFCBottomSheet variant prop', () => {
    function lastProps() {
      const calls = MockNFCBottomSheet.mock.calls;
      return calls[calls.length - 1][0];
    }

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

    it('nfc.phase is pin_entry when phase is pin_entry', async () => {
      await renderScreen('pin_entry');
      expect(lastProps().nfc.phase).toBe('pin_entry');
    });
  });

  describe('navigation delay after done', () => {
    it('does not navigate immediately when phase becomes done', async () => {
      mockUseKeycardOperation.mockReturnValue({
        ...hookMock('done'),
        result: new Uint8Array([1, 2, 3]),
      });
      await act(async () => {
        ReactTestRenderer.create(
          <KeycardScreen route={signRoute} navigation={navigation} />,
        );
      });
      expect(navigation.reset).not.toHaveBeenCalled();
    });

    it('navigates after the 800ms timer fires', async () => {
      const { buildEthSignatureUR } = require('../src/utils/ethSignature') as {
        buildEthSignatureUR: jest.Mock;
      };
      buildEthSignatureUR.mockReturnValue('UR:ETH-SIGN/...');

      mockUseKeycardOperation.mockReturnValue({
        ...hookMock('done'),
        result: new Uint8Array([1, 2, 3]),
      });
      await act(async () => {
        ReactTestRenderer.create(
          <KeycardScreen route={signRoute} navigation={navigation} />,
        );
      });
      expect(navigation.reset).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(800);
      });
      expect(navigation.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('PIN pad input', () => {
    function lastProps() {
      const calls = MockNFCBottomSheet.mock.calls;
      return calls[calls.length - 1][0];
    }

    it('nfc.submitPin is the submitPin function when phase is pin_entry', async () => {
      await renderScreen('pin_entry');
      expect(lastProps().nfc.submitPin).toBe(mockSubmitPin);
    });

    it('nfc.submitPin is available when phase is pin_entry', async () => {
      await renderScreen('pin_entry');
      expect(typeof lastProps().nfc.submitPin).toBe('function');
    });
  });
});
