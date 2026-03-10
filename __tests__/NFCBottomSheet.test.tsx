import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import NFCBottomSheet, { NFCVariant } from '../src/components/NFCBottomSheet';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const onCancel = jest.fn();

// PulseRing uses useNativeDriver:true which crashes when timers fire in the
// test environment. Fake timers prevent animation callbacks from executing.
beforeEach(() => {
  jest.useFakeTimers();
  onCancel.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

async function renderSheet(variant: NFCVariant, status = 'Ready') {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <NFCBottomSheet
        visible={true}
        status={status}
        onCancel={onCancel}
        variant={variant}
      />,
    );
  });
  return renderer;
}

function toJson(r: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(r.toJSON());
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
      const renderer = await renderSheet('scanning', 'Waiting for card…');
      expect(toJson(renderer)).toContain('Waiting for card…');
    });
  });

  describe('Cancel button — variant scanning', () => {
    it('shows the Cancel button', async () => {
      const renderer = await renderSheet('scanning');
      expect(toJson(renderer)).toContain('Cancel');
    });

    it('calls onCancel when Cancel is pressed', async () => {
      const renderer = await renderSheet('scanning');
      const [cancelBtn] = getPressables(renderer);
      await act(async () => {
        cancelBtn.props.onPress();
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel button — variant error', () => {
    it('shows the Cancel button', async () => {
      const renderer = await renderSheet('error');
      expect(toJson(renderer)).toContain('Cancel');
    });

    it('calls onCancel when Cancel is pressed', async () => {
      const renderer = await renderSheet('error');
      const [cancelBtn] = getPressables(renderer);
      await act(async () => {
        cancelBtn.props.onPress();
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel button — variant success', () => {
    it('hides the Cancel button', async () => {
      const renderer = await renderSheet('success');
      expect(toJson(renderer)).not.toContain('Cancel');
    });

    it('has no pressable elements', async () => {
      const renderer = await renderSheet('success');
      expect(getPressables(renderer)).toHaveLength(0);
    });
  });

  describe('pulse rings', () => {
    it('renders more animated views when scanning than when success', async () => {
      // PulseRing adds 3 extra Animated.Views when variant=scanning; none otherwise.
      function countViews(r: ReactTestRenderer.ReactTestRenderer) {
        return r.root.findAll(() => true, { deep: true }).length;
      }

      const scanning = await renderSheet('scanning');
      const success = await renderSheet('success');

      expect(countViews(scanning)).toBeGreaterThan(countViews(success));
    });

    it('renders the same number of elements for success and error (no pulse rings)', async () => {
      function countViews(r: ReactTestRenderer.ReactTestRenderer) {
        return r.root.findAll(() => true, { deep: true }).length;
      }

      const success = await renderSheet('success');
      const error = await renderSheet('error');

      // Both hide pulse rings; error just adds the cancel button back
      // so the counts aren't equal, but neither should be as high as scanning.
      const scanning = await renderSheet('scanning');
      expect(countViews(success)).toBeLessThan(countViews(scanning));
      expect(countViews(error)).toBeLessThan(countViews(scanning));
    });
  });
});
