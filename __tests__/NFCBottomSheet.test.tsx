import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import NFCBottomSheet from '../src/components/NFCBottomSheet';
import type { NFCOperation } from '../src/components/NFCBottomSheet';

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

jest.mock('../src/components/PinPad', () => {
  const { View } = require('react-native');
  return () => <View testID="pin-pad" />;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const onCancel = jest.fn();

function makeNfc(
  phase: string,
  extra: Partial<NFCOperation> = {},
): NFCOperation {
  return { phase, status: 'Ready', ...extra };
}

// PulseRing uses useNativeDriver:true which crashes when timers fire in the
// test environment. Fake timers prevent animation callbacks from executing.
beforeEach(() => {
  jest.useFakeTimers();
  onCancel.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

async function renderSheet(nfc: NFCOperation, showOnDone?: boolean) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <NFCBottomSheet nfc={nfc} onCancel={onCancel} showOnDone={showOnDone} />,
    );
  });
  return renderer;
}

function getPressables(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    (node: any) => typeof node.props.onPress === 'function',
    { deep: true },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NFCBottomSheet', () => {
  describe('status text', () => {
    it('renders the status string', async () => {
      const renderer = await renderSheet(
        makeNfc('nfc', { status: 'Waiting for card…' }),
      );
      expect(JSON.stringify(renderer.toJSON())).toContain('Waiting for card…');
    });
  });

  describe('Cancel button — phase nfc (scanning)', () => {
    it('shows the Cancel button', async () => {
      const renderer = await renderSheet(makeNfc('nfc'));
      expect(JSON.stringify(renderer.toJSON())).toContain('Cancel');
    });

    it('calls onCancel when Cancel is pressed', async () => {
      const renderer = await renderSheet(makeNfc('nfc'));
      const [cancelBtn] = getPressables(renderer);
      await act(async () => {
        cancelBtn.props.onPress();
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel button — phase error', () => {
    it('shows the Cancel button', async () => {
      const renderer = await renderSheet(makeNfc('error'));
      expect(JSON.stringify(renderer.toJSON())).toContain('Cancel');
    });

    it('calls onCancel when Cancel is pressed', async () => {
      const renderer = await renderSheet(makeNfc('error'));
      const [cancelBtn] = getPressables(renderer);
      await act(async () => {
        cancelBtn.props.onPress();
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel button — phase done with showOnDone', () => {
    it('hides the Cancel button (success variant)', async () => {
      const renderer = await renderSheet(makeNfc('done'), true);
      expect(JSON.stringify(renderer.toJSON())).not.toContain('Cancel');
    });

    it('has no pressable elements', async () => {
      const renderer = await renderSheet(makeNfc('done'), true);
      expect(getPressables(renderer)).toHaveLength(0);
    });
  });

  describe('genuine_warning phase', () => {
    const onProceed = jest.fn();

    beforeEach(() => {
      onProceed.mockClear();
    });

    it('shows the unverified title', async () => {
      const renderer = await renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      expect(JSON.stringify(renderer.toJSON())).toContain('Unverified Keycard');
    });

    it('shows warning body text', async () => {
      const renderer = await renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      expect(JSON.stringify(renderer.toJSON())).toContain(
        'could not be verified',
      );
    });

    it('shows Cancel and Proceed Anyway buttons', async () => {
      const renderer = await renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      const json = JSON.stringify(renderer.toJSON());
      expect(json).toContain('Cancel');
      expect(json).toContain('Proceed Anyway');
    });

    it('calls onCancel when Cancel is pressed', async () => {
      const renderer = await renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      const cancelBtn = renderer.root.find(
        (n: any) => n.props.testID === 'cancel-button',
      );
      await act(async () => {
        cancelBtn.props.onPress();
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onProceed).not.toHaveBeenCalled();
    });

    it('calls proceedWithNonGenuine when Proceed Anyway is pressed', async () => {
      const renderer = await renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      const proceedBtn = renderer.root.find(
        (n: any) => n.props.testID === 'proceed-button',
      );
      await act(async () => {
        proceedBtn.props.onPress();
      });
      expect(onProceed).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('does not show the NFC icon area', async () => {
      const renderer = await renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        'Tap your Keycard',
      );
    });
  });

  describe('pin_entry phase', () => {
    it('renders PinPad instead of the bottom sheet', async () => {
      const submitPin = jest.fn();
      const renderer = await renderSheet(makeNfc('pin_entry', { submitPin }));
      expect(
        renderer.root.findAll((n: any) => n.props.testID === 'pin-pad').length,
      ).toBeGreaterThan(0);
    });

    it('does not show the NFC sheet content', async () => {
      const submitPin = jest.fn();
      const renderer = await renderSheet(makeNfc('pin_entry', { submitPin }));
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        'Tap your Keycard',
      );
    });
  });

  describe('pulse rings', () => {
    it('renders more animated views when scanning than when done+showOnDone', async () => {
      function countViews(r: ReactTestRenderer.ReactTestRenderer) {
        return r.root.findAll(() => true, { deep: true }).length;
      }

      const scanning = await renderSheet(makeNfc('nfc'));
      const success = await renderSheet(makeNfc('done'), true);

      expect(countViews(scanning)).toBeGreaterThan(countViews(success));
    });

    it('error has fewer elements than scanning (no pulse rings)', async () => {
      function countViews(r: ReactTestRenderer.ReactTestRenderer) {
        return r.root.findAll(() => true, { deep: true }).length;
      }

      const scanning = await renderSheet(makeNfc('nfc'));
      const error = await renderSheet(makeNfc('error'));

      expect(countViews(error)).toBeLessThan(countViews(scanning));
    });
  });
});
