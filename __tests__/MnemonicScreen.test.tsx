import React, { act } from 'react';
import { TextInput } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import NFCBottomSheet from '../src/components/NFCBottomSheet';
import MnemonicScreen from '../src/screens/keypair/MnemonicScreen';

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

jest.mock('../src/components/PinPad', () => () => null);

jest.mock('../src/assets/icons', () => ({
  Icons: { nfcActivate: () => null },
}));

const mockStart = jest.fn();
const mockCancel = jest.fn();
const mockSubmitPin = jest.fn();
const mockUseLoadKey = jest.fn();
const mockUseVerifyFingerprint = jest.fn();

jest.mock('../src/hooks/keycard/useLoadKey', () => ({
  useLoadKey: (...args: any[]) => mockUseLoadKey(...args),
  deriveMnemonicKeyPair: jest.fn(() => ({ type: 'keypair' })),
}));

jest.mock('../src/hooks/keycard/useVerifyFingerprint', () => ({
  useVerifyFingerprint: (...args: any[]) => mockUseVerifyFingerprint(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_12 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// 24 valid words
const VALID_24 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

const navigation = {
  navigate: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
} as any;

const route = { key: 'Mnemonic', name: 'Mnemonic', params: undefined } as any;
const routeVerify = {
  key: 'Mnemonic',
  name: 'Mnemonic',
  params: { mode: 'verify' },
} as any;

function hookMock(phase = 'idle', result: string | null = null) {
  return {
    phase,
    result,
    status: '',
    pinError: null,
    start: mockStart,
    cancel: mockCancel,
    submitPin: mockSubmitPin,
  };
}

function renderScreen(phase = 'idle') {
  mockUseLoadKey.mockReturnValue(hookMock(phase));
  mockUseVerifyFingerprint.mockReturnValue(hookMock(phase));
  return render(<MnemonicScreen navigation={navigation} route={route} />);
}

function getTextInputs() {
  return screen.UNSAFE_getAllByType(TextInput);
}

function getWordInput() {
  return getTextInputs()[0];
}

function getPassphraseInput() {
  return getTextInputs()[1];
}

function getButton(label = 'Continue') {
  let node: any = screen.getByText(label);
  while (node) {
    if (typeof node.props?.onPress === 'function') {
      return node;
    }
    node = node.parent;
  }
  throw new Error(`No button found for ${label}`);
}

function getSegment(label: string) {
  let node: any = screen.getByText(label);
  while (node) {
    if (typeof node.props?.onPress === 'function') {
      return node;
    }
    node = node.parent;
  }
  throw new Error(`No segment found for ${label}`);
}

function setInput(text: string) {
  return act(async () => {
    fireEvent.changeText(getWordInput(), text);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MnemonicScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
    navigation.reset.mockClear();
    navigation.setOptions.mockClear();
    mockStart.mockClear();
    mockCancel.mockClear();
    MockNFCBottomSheet.mockClear();
    mockUseLoadKey.mockReturnValue(hookMock());
    mockUseVerifyFingerprint.mockReturnValue(hookMock());
  });

  describe('layout', () => {
    it('renders the 12/24 word selector', async () => {
      renderScreen();
      expect(screen.getByText('12 words')).toBeTruthy();
      expect(screen.getByText('24 words')).toBeTruthy();
    });

    it('renders the word input with multiline', async () => {
      renderScreen();
      expect(getWordInput().props.multiline).toBe(true);
    });

    it('renders the passphrase input with correct placeholder', async () => {
      renderScreen();
      expect(getPassphraseInput().props.placeholder).toBe(
        'Passphrase (optional)',
      );
    });

    it('renders the Continue button', async () => {
      renderScreen();
      expect(screen.getByText('Continue')).toBeTruthy();
    });
  });

  describe('word count selector', () => {
    it('defaults to 12-word mode', async () => {
      renderScreen();
      const seg12 = getSegment('12 words');
      // active segment gets segmentActive style (#474747 background)
      const style = [seg12?.props.style].flat();
      expect(JSON.stringify(style)).toContain('474747');
    });

    it('switches to 24-word mode when the 24-word segment is pressed', async () => {
      renderScreen();
      await act(async () => {
        fireEvent.press(screen.getByText('24 words'));
      });
      const seg24 = getSegment('24 words');
      const style = [seg24?.props.style].flat();
      expect(JSON.stringify(style)).toContain('474747');
    });
  });

  describe('Continue button disabled state', () => {
    it('is disabled when input is empty', async () => {
      renderScreen();
      // clear the test prefill
      await setInput('');
      expect(getButton().props.disabled).toBe(true);
    });

    it('is enabled when the correct number of words are entered', async () => {
      renderScreen();
      await setInput(VALID_12);
      expect(getButton().props.disabled).toBe(false);
    });

    it('remains disabled when word count does not match selector (24 mode, 12 words)', async () => {
      renderScreen();
      // switch to 24-word mode
      await act(async () => {
        fireEvent.press(screen.getByText('24 words'));
      });
      await setInput(VALID_12);
      expect(getButton().props.disabled).toBe(true);
    });

    it('is enabled when 24 words are entered in 24-word mode', async () => {
      renderScreen();
      await act(async () => {
        fireEvent.press(screen.getByText('24 words'));
      });
      await setInput(VALID_24);
      expect(getButton().props.disabled).toBe(false);
    });
  });

  describe('word validation', () => {
    it('shows error for invalid completed word', async () => {
      renderScreen();
      // trailing space triggers validation of the completed word
      await setInput('notaword ');
      expect(screen.getByText(/notaword/)).toBeTruthy();
      expect(screen.getByText(/is not a valid BIP39 word/)).toBeTruthy();
    });

    it('does not show error while word is still being typed', async () => {
      renderScreen();
      await setInput('aban');
      expect(screen.queryByText(/is not a valid BIP39 word/)).toBeNull();
    });

    it('does not show error for a valid completed word', async () => {
      renderScreen();
      await setInput('abandon ');
      expect(screen.queryByText(/is not a valid BIP39 word/)).toBeNull();
    });
  });

  describe('Continue pressed', () => {
    it('shows phrase error when mnemonic is invalid', async () => {
      renderScreen();
      // 12 words but checksum is wrong
      await setInput(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
      );
      await act(async () => {
        fireEvent.press(screen.getByText('Continue'));
      });
      expect(screen.getByText('Invalid recovery phrase')).toBeTruthy();
      expect(mockStart).not.toHaveBeenCalled();
    });

    it('calls start() when mnemonic is valid', async () => {
      renderScreen();
      await setInput(VALID_12);
      await act(async () => {
        fireEvent.press(screen.getByText('Continue'));
      });
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it('passes words to useLoadKey', async () => {
      mockUseLoadKey.mockClear();
      renderScreen();
      await setInput(VALID_12);
      expect(mockUseLoadKey).toHaveBeenCalled();
    });

    it('passes passphrase to the local derivation helper when entered', async () => {
      renderScreen();
      await setInput(VALID_12);
      await act(async () => {
        fireEvent.changeText(getPassphraseInput(), 'mysecret');
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Continue'));
      });
      const { deriveMnemonicKeyPair } = jest.requireMock(
        '../src/hooks/keycard/useLoadKey',
      );
      expect(deriveMnemonicKeyPair).toHaveBeenLastCalledWith(
        VALID_12.split(' '),
        'mysecret',
      );
    });
  });

  describe('navigation', () => {
    it('navigates to Dashboard with toast when phase is done (import mode)', async () => {
      await renderScreen('done');
      expect(navigation.navigate).toHaveBeenCalledWith('Dashboard', {
        toast: 'Key pair has been added to Keycard',
      });
    });

    it('does not navigate when phase is not done', async () => {
      await renderScreen('idle');
      expect(navigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('verify mode', () => {
    function renderVerify(phase = 'idle', result: string | null = null) {
      mockUseLoadKey.mockReturnValue(hookMock(phase));
      mockUseVerifyFingerprint.mockReturnValue(hookMock(phase, result));
      return render(
        <MnemonicScreen navigation={navigation} route={routeVerify} />,
      );
    }

    it('shows "Verify" button label', async () => {
      renderVerify();
      expect(screen.getByText('Verify')).toBeTruthy();
    });

    it('derives a fingerprint locally and passes it to verify start', async () => {
      renderVerify();
      await setInput(VALID_12);
      await act(async () => {
        fireEvent.changeText(getPassphraseInput(), 'mysecret');
      });

      await act(async () => {
        fireEvent.press(screen.getByText('Verify'));
      });

      expect(mockStart).toHaveBeenCalledWith(expect.any(Number));
    });

    it('resets to Dashboard with match toast', async () => {
      await renderVerify('done', 'match');
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          { name: 'Dashboard', params: { toast: 'Recovery phrase matches' } },
        ],
      });
    });

    it('resets to Dashboard with mismatch toast', async () => {
      await renderVerify('done', 'mismatch');
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: 'Dashboard',
            params: { toast: 'Recovery phrase does not match' },
          },
        ],
      });
    });
  });

  describe('NFC sheet', () => {
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
});
