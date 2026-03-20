import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ImportKeyScreen from '../src/screens/keypair/ImportKeyScreen';
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

jest.mock('../src/components/PinPad', () => () => null);

jest.mock('../src/assets/icons', () => ({
  Icons: { nfcActivate: () => null },
}));

const mockStart = jest.fn();
const mockCancel = jest.fn();
const mockSubmitPin = jest.fn();
const mockUseLoadKey = jest.fn();

jest.mock('../src/hooks/keycard/useLoadKey', () => ({
  useLoadKey: (...args: any[]) => mockUseLoadKey(...args),
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
  setOptions: jest.fn(),
} as any;

const route = { key: 'ImportKey', name: 'ImportKey' } as any;

function hookMock(phase = 'idle') {
  return {
    phase,
    status: '',
    pinError: null,
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
      <ImportKeyScreen navigation={navigation} route={route} />,
    );
  });
  return renderer;
}

function toJson(r: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(r.toJSON());
}

function extractText(node: any): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.children) return extractText(node.children);
  return '';
}

function getTextInputs(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll((node: any) => node.type === 'TextInput', {
    deep: true,
  });
}

function getWordInput(renderer: ReactTestRenderer.ReactTestRenderer) {
  return getTextInputs(renderer)[0];
}

function getPassphraseInput(renderer: ReactTestRenderer.ReactTestRenderer) {
  return getTextInputs(renderer)[1];
}

function getContinueButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    (node: any) =>
      typeof node.props.onPress === 'function' &&
      node.props.disabled !== undefined,
    { deep: true },
  )[0];
}

function setInput(renderer: ReactTestRenderer.ReactTestRenderer, text: string) {
  return act(async () => {
    getWordInput(renderer).props.onChangeText(text);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImportKeyScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
    navigation.setOptions.mockClear();
    mockStart.mockClear();
    mockCancel.mockClear();
    MockNFCBottomSheet.mockClear();
    mockUseLoadKey.mockReturnValue(hookMock());
  });

  describe('layout', () => {
    it('renders the 12/24 word selector', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('12 words');
      expect(toJson(renderer)).toContain('24 words');
    });

    it('renders the word input with multiline', async () => {
      const renderer = await renderScreen();
      expect(getWordInput(renderer).props.multiline).toBe(true);
    });

    it('renders the passphrase input with correct placeholder', async () => {
      const renderer = await renderScreen();
      expect(getPassphraseInput(renderer).props.placeholder).toBe(
        'Passphrase (optional)',
      );
    });

    it('renders the Continue button', async () => {
      const renderer = await renderScreen();
      expect(toJson(renderer)).toContain('Continue');
    });
  });

  describe('word count selector', () => {
    it('defaults to 12-word mode', async () => {
      const renderer = await renderScreen();
      // find the segment pressables by their label text
      const segments = renderer.root.findAll(
        (node: any) =>
          typeof node.props.onPress === 'function' &&
          (extractText(node).trim() === '12 words' ||
            extractText(node).trim() === '24 words'),
        { deep: true },
      );
      const seg12 = segments.find(s => extractText(s).trim() === '12 words');
      // active segment gets segmentActive style (#474747 background)
      const style = [seg12?.props.style].flat();
      expect(JSON.stringify(style)).toContain('474747');
    });

    it('switches to 24-word mode when the 24-word segment is pressed', async () => {
      const renderer = await renderScreen();
      const segments = renderer.root.findAll(
        (node: any) =>
          typeof node.props.onPress === 'function' &&
          (extractText(node).trim() === '12 words' ||
            extractText(node).trim() === '24 words'),
        { deep: true },
      );
      const seg24 = segments.find(s => extractText(s).trim() === '24 words');
      await act(async () => {
        seg24?.props.onPress();
      });
      const style = [seg24?.props.style].flat();
      expect(JSON.stringify(style)).toContain('474747');
    });
  });

  describe('Continue button disabled state', () => {
    it('is disabled when input is empty', async () => {
      const renderer = await renderScreen();
      // clear the test prefill
      await setInput(renderer, '');
      expect(getContinueButton(renderer).props.disabled).toBe(true);
    });

    it('is enabled when the correct number of words are entered', async () => {
      const renderer = await renderScreen();
      await setInput(renderer, VALID_12);
      expect(getContinueButton(renderer).props.disabled).toBe(false);
    });

    it('remains disabled when word count does not match selector (24 mode, 12 words)', async () => {
      const renderer = await renderScreen();
      // switch to 24-word mode
      const segments = renderer.root.findAll(
        (node: any) =>
          typeof node.props.onPress === 'function' &&
          extractText(node).trim() === '24 words',
        { deep: true },
      );
      await act(async () => {
        segments[0]?.props.onPress();
      });
      await setInput(renderer, VALID_12);
      expect(getContinueButton(renderer).props.disabled).toBe(true);
    });

    it('is enabled when 24 words are entered in 24-word mode', async () => {
      const renderer = await renderScreen();
      const segments = renderer.root.findAll(
        (node: any) =>
          typeof node.props.onPress === 'function' &&
          extractText(node).trim() === '24 words',
        { deep: true },
      );
      await act(async () => {
        segments[0]?.props.onPress();
      });
      await setInput(renderer, VALID_24);
      expect(getContinueButton(renderer).props.disabled).toBe(false);
    });
  });

  describe('word validation', () => {
    it('shows error for invalid completed word', async () => {
      const renderer = await renderScreen();
      // trailing space triggers validation of the completed word
      await setInput(renderer, 'notaword ');
      expect(toJson(renderer)).toContain('notaword');
      expect(toJson(renderer)).toContain('is not a valid BIP39 word');
    });

    it('does not show error while word is still being typed', async () => {
      const renderer = await renderScreen();
      await setInput(renderer, 'aban');
      expect(toJson(renderer)).not.toContain('is not a valid BIP39 word');
    });

    it('does not show error for a valid completed word', async () => {
      const renderer = await renderScreen();
      await setInput(renderer, 'abandon ');
      expect(toJson(renderer)).not.toContain('is not a valid BIP39 word');
    });
  });

  describe('Continue pressed', () => {
    it('shows phrase error when mnemonic is invalid', async () => {
      const renderer = await renderScreen();
      // 12 words but checksum is wrong
      await setInput(
        renderer,
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
      );
      await act(async () => {
        getContinueButton(renderer).props.onPress();
      });
      expect(toJson(renderer)).toContain('Invalid recovery phrase');
      expect(mockStart).not.toHaveBeenCalled();
    });

    it('calls start() when mnemonic is valid', async () => {
      const renderer = await renderScreen();
      await setInput(renderer, VALID_12);
      await act(async () => {
        getContinueButton(renderer).props.onPress();
      });
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it('passes words to useLoadKey', async () => {
      mockUseLoadKey.mockClear();
      const renderer = await renderScreen();
      await setInput(renderer, VALID_12);
      expect(mockUseLoadKey).toHaveBeenCalledWith(
        VALID_12.split(' '),
        undefined,
      );
    });

    it('passes passphrase to useLoadKey when entered', async () => {
      mockUseLoadKey.mockClear();
      const renderer = await renderScreen();
      await setInput(renderer, VALID_12);
      await act(async () => {
        getPassphraseInput(renderer).props.onChangeText('mysecret');
      });
      expect(mockUseLoadKey).toHaveBeenCalledWith(
        VALID_12.split(' '),
        'mysecret',
      );
    });
  });

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
  });

  describe('NFC sheet', () => {
    it('is hidden when phase is idle', async () => {
      await renderScreen('idle');
      const lastCall =
        MockNFCBottomSheet.mock.calls[
          MockNFCBottomSheet.mock.calls.length - 1
        ][0];
      expect(lastCall.visible).toBe(false);
    });

    it('is visible in scanning variant when phase is nfc', async () => {
      await renderScreen('nfc');
      const lastCall =
        MockNFCBottomSheet.mock.calls[
          MockNFCBottomSheet.mock.calls.length - 1
        ][0];
      expect(lastCall.visible).toBe(true);
      expect(lastCall.variant).toBe('scanning');
    });

    it('is visible in error variant when phase is error', async () => {
      await renderScreen('error');
      const lastCall =
        MockNFCBottomSheet.mock.calls[
          MockNFCBottomSheet.mock.calls.length - 1
        ][0];
      expect(lastCall.visible).toBe(true);
      expect(lastCall.variant).toBe('error');
    });
  });
});
