import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

import NFCBottomSheet from '../src/components/NFCBottomSheet';
import Slip39Screen from '../src/screens/keypair/Slip39Screen';

const SHARE_1 =
  'very graduate academic acid best smith recall exclude apart company amount junior alive believe withdraw alien company hospital payroll lend';
const SHARE_2 =
  'very graduate academic agency dish traveler veteran facility hormone camera kind hearing debut carve either demand valuable diminish triumph treat';
const INVALID_SHARE =
  'very graduate academic acid best smith recall exclude apart company amount junior alive believe withdraw alien company hospital payroll nope';
const { generateSlip39SharesFromKeycardEntropy: realGenerateSlip39Shares } =
  jest.requireActual(
    '../src/utils/slip39',
  ) as typeof import('../src/utils/slip39');
const SINGLE_SHARE = realGenerateSlip39Shares(new Uint8Array([9, 8, 7, 6]), {
  shareCount: 1,
  threshold: 1,
})[0];

const mockStartLoad = jest.fn();
const mockStartGenerate = jest.fn();
const mockStartVerify = jest.fn();
const mockCancel = jest.fn();
const mockResetGenerate = jest.fn();
const mockUseGenerateSlip39Shares = jest.fn();
const mockUseLoadKey = jest.fn();
const mockUseVerifyFingerprint = jest.fn();
const mockGenerateSlip39SharesFromKeycardEntropy = jest.fn();

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

jest.mock('../src/hooks/keycard/useGenerateSlip39Shares', () => ({
  useGenerateSlip39Shares: (...args: any[]) =>
    mockUseGenerateSlip39Shares(...args),
}));

jest.mock('../src/hooks/keycard/useLoadKey', () => ({
  useLoadKey: (...args: any[]) => mockUseLoadKey(...args),
}));

jest.mock('../src/hooks/keycard/useVerifyFingerprint', () => ({
  useVerifyFingerprint: (...args: any[]) => mockUseVerifyFingerprint(...args),
}));

jest.mock('../src/utils/slip39', () => {
  const actual = jest.requireActual('../src/utils/slip39');
  return {
    ...actual,
    generateSlip39SharesFromKeycardEntropy: (...args: any[]) =>
      mockGenerateSlip39SharesFromKeycardEntropy(...args),
  };
});

const navigation = {
  navigate: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
} as any;

function hookMock(start = mockStartLoad, phase = 'idle', result: any = null) {
  return {
    phase,
    result,
    status: '',
    pinError: null,
    start,
    cancel: mockCancel,
    submitPin: jest.fn(),
  };
}

function route(mode: 'generate' | 'import' | 'verify') {
  return { key: 'Slip39', name: 'Slip39', params: { mode } } as any;
}

async function renderScreen(
  mode: 'generate' | 'import' | 'verify' = 'import',
  phase = 'idle',
  result: string | null = null,
  generatePhase = 'idle',
  generateResult: Uint8Array | null = null,
) {
  mockUseGenerateSlip39Shares.mockReturnValue({
    ...hookMock(mockStartGenerate, generatePhase, generateResult as any),
    reset: mockResetGenerate,
  });
  mockUseLoadKey.mockReturnValue(hookMock(mockStartLoad, phase, result));
  mockUseVerifyFingerprint.mockReturnValue(
    hookMock(mockStartVerify, phase, result),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Slip39Screen navigation={navigation} route={route(mode)} />,
    );
  });
  return renderer;
}

async function flushTimers() {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
}

function toText(r: ReactTestRenderer.ReactTestRenderer): string {
  return extractText(r.toJSON());
}

function getTextInputs(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll((node: any) => node.type === 'TextInput', {
    deep: true,
  });
}

function extractText(node: any): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.children) return extractText(node.children);
  return '';
}

function getPressableByText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  return renderer.root
    .findAll((node: any) => typeof node.props.onPress === 'function', {
      deep: true,
    })
    .find(node => extractText(node).includes(text));
}

describe('Slip39Screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    navigation.navigate.mockClear();
    navigation.reset.mockClear();
    navigation.setOptions.mockClear();
    mockStartLoad.mockClear();
    mockStartGenerate.mockClear();
    mockStartVerify.mockClear();
    mockCancel.mockClear();
    mockResetGenerate.mockClear();
    mockGenerateSlip39SharesFromKeycardEntropy.mockReset();
    mockGenerateSlip39SharesFromKeycardEntropy.mockReturnValue([
      SHARE_1,
      SHARE_2,
    ]);
    MockNFCBottomSheet.mockClear();
    mockUseGenerateSlip39Shares.mockReturnValue(hookMock(mockStartGenerate));
    mockUseLoadKey.mockReturnValue(hookMock());
    mockUseVerifyFingerprint.mockReturnValue(hookMock(mockStartVerify));
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    (Math.random as jest.Mock).mockRestore();
    jest.useRealTimers();
  });

  it('adds shares until the SLIP39 threshold is reached', async () => {
    const renderer = await renderScreen('import');

    expect(toText(renderer)).toContain('Enter share 1.');
    expect(toText(renderer)).not.toContain('SLIP39 passphrase');
    await act(async () => {
      getTextInputs(renderer)[0].props.onChangeText(SHARE_1);
    });
    expect(toText(renderer)).toContain('20/20 words');
    await act(async () => {
      getPressableByText(renderer, 'Next share')!.props.onPress();
    });
    expect(toText(renderer)).toContain('Enter share 2 of 2.');
    expect(toText(renderer)).not.toContain(SHARE_1);
    expect(getTextInputs(renderer)).toHaveLength(2);
    expect(getTextInputs(renderer)[0].props.value).toBe('');
    await act(async () => {
      getTextInputs(renderer)[0].props.onChangeText(SHARE_2);
    });
    expect(getPressableByText(renderer, 'Import to Keycard')).toBeDefined();

    await act(async () => {
      getPressableByText(renderer, 'Import to Keycard')!.props.onPress();
    });
    await flushTimers();

    expect(mockStartLoad).toHaveBeenCalledTimes(1);
  });

  it('enables Next share for a complete valid share', async () => {
    const renderer = await renderScreen('import');

    await act(async () => {
      getTextInputs(renderer)[0].props.onChangeText(SHARE_1);
    });

    expect(toText(renderer)).toContain('20/20 words');
    expect(getPressableByText(renderer, 'Next share')!.props.disabled).toBe(
      false,
    );
  });

  it('shows an error for invalid completed SLIP39 words', async () => {
    const renderer = await renderScreen('import');

    await act(async () => {
      getTextInputs(renderer)[0].props.onChangeText(INVALID_SHARE);
    });

    expect(toText(renderer)).toContain('"nope" is not a valid SLIP39 word');
    expect(getPressableByText(renderer, 'Next share')!.props.disabled).toBe(
      true,
    );
  });

  it('shows the passphrase field after four words when preview metadata indicates 1/1', async () => {
    const renderer = await renderScreen('import');

    await act(async () => {
      getTextInputs(renderer)[0].props.onChangeText(
        SINGLE_SHARE.split(' ').slice(0, 4).join(' '),
      );
    });

    expect(toText(renderer)).toContain('Enter share 1 of 1.');
    expect(getTextInputs(renderer)).toHaveLength(2);
    expect(getPressableByText(renderer, 'Import to Keycard')).toBeDefined();
  });

  it('uses verify hook and reset toast in verify mode', async () => {
    await renderScreen('verify', 'done', 'match');

    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Dashboard', params: { toast: 'SLIP39 shares match' } }],
    });
  });

  it('starts Keycard entropy generation before showing generated shares', async () => {
    const renderer = await renderScreen('generate');

    await act(async () => {
      getPressableByText(renderer, 'Generate SLIP39 shares')!.props.onPress();
    });

    expect(mockStartGenerate).toHaveBeenCalledTimes(1);
  });

  it('shows generated shares before loading them to the card', async () => {
    const entropy = new Uint8Array([1, 2, 3]);
    const renderer = await renderScreen(
      'generate',
      'idle',
      null,
      'done',
      entropy,
    );
    expect(toText(renderer)).toContain('Creating SLIP39 shares...');
    await flushTimers();

    expect(mockGenerateSlip39SharesFromKeycardEntropy).toHaveBeenCalledWith(
      entropy,
      { shareCount: 3, threshold: 2 },
    );
    expect(entropy).toEqual(new Uint8Array([0, 0, 0]));

    expect(toText(renderer)).toContain('Share');
    expect(toText(renderer)).toContain('1/2');
    expect(toText(renderer)).not.toContain('2/2');
    expect(toText(renderer)).toContain('1.very');
    expect(toText(renderer)).toContain('20.lend');
    expect(toText(renderer)).toContain('2 shares generated, threshold 2');
    await act(async () => {
      getPressableByText(renderer, 'I saved this share')!.props.onPress();
    });
    expect(toText(renderer)).toContain(
      'Confirm word positions in your backup share.',
    );
    expect(toText(renderer)).not.toContain('1.very');

    await act(async () => {
      getPressableByText(renderer, 'academic')!.props.onPress();
    });
    expect(toText(renderer)).toContain('____');

    for (const word of ['graduate', 'academic', 'acid', 'best']) {
      await act(async () => {
        getPressableByText(renderer, word)!.props.onPress();
      });
    }
    expect(toText(renderer)).toContain('2/2');
    await act(async () => {
      getPressableByText(renderer, 'I saved the last share')!.props.onPress();
    });
    for (const word of ['graduate', 'academic', 'agency', 'dish']) {
      await act(async () => {
        getPressableByText(renderer, word)!.props.onPress();
      });
    }
    expect(toText(renderer)).toContain('All shares saved');
    await act(async () => {
      getPressableByText(renderer, 'Load to Keycard')!.props.onPress();
    });
    expect(toText(renderer)).toContain('Preparing key material...');
    expect(toText(renderer)).not.toContain('All shares are saved');
    await flushTimers();
    expect(mockStartLoad).toHaveBeenCalledTimes(1);
    expect(mockResetGenerate).toHaveBeenCalledTimes(1);
  });

  it('passes NFC props through the bottom sheet', async () => {
    await renderScreen('import');

    expect(MockNFCBottomSheet.mock.calls[0][0].nfc.phase).toBe('idle');
  });
});
