import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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

function renderSheet(nfc: NFCOperation, showOnDone?: boolean) {
  return render(
    <NFCBottomSheet nfc={nfc} onCancel={onCancel} showOnDone={showOnDone} />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NFCBottomSheet', () => {
  describe('status text', () => {
    it('renders the status string', () => {
      renderSheet(makeNfc('nfc', { status: 'Waiting for card…' }));
      expect(screen.getByText('Waiting for card…')).toBeTruthy();
    });

    it('shows the card name after it is read', () => {
      renderSheet(makeNfc('nfc', { cardName: 'Main card' }));
      expect(screen.getByText('Main card')).toBeTruthy();
    });

    it('shows unnamed placeholder for a blank card name', () => {
      renderSheet(makeNfc('nfc', { cardName: '' }));
      expect(screen.getByText('Unnamed card')).toBeTruthy();
    });
  });

  describe('Cancel button — phase nfc (scanning)', () => {
    it('shows the Cancel button', () => {
      renderSheet(makeNfc('nfc'));
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('calls onCancel when Cancel is pressed', () => {
      renderSheet(makeNfc('nfc'));
      fireEvent.press(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel button — phase error', () => {
    it('shows the Cancel button', () => {
      renderSheet(makeNfc('error'));
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('calls onCancel when Cancel is pressed', () => {
      renderSheet(makeNfc('error'));
      fireEvent.press(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel button — phase done with showOnDone', () => {
    it('hides the Cancel button (success variant)', () => {
      renderSheet(makeNfc('done'), true);
      expect(screen.queryByText('Cancel')).toBeNull();
    });

    it('has no pressable elements', () => {
      renderSheet(makeNfc('done'), true);
      const pressables = screen.UNSAFE_queryAllByType(
        require('react-native').Pressable,
      );
      expect(pressables).toHaveLength(0);
    });
  });

  describe('genuine_warning phase', () => {
    const onProceed = jest.fn();

    beforeEach(() => {
      onProceed.mockClear();
    });

    it('shows the unverified title', () => {
      renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      expect(screen.getByText('Unverified Keycard')).toBeTruthy();
    });

    it('shows warning body text', () => {
      renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      expect(screen.queryByText(/could not be verified/)).toBeTruthy();
    });

    it('shows Cancel and Proceed Anyway buttons', () => {
      renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Proceed Anyway')).toBeTruthy();
    });

    it('calls onCancel when Cancel is pressed', () => {
      renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      fireEvent.press(screen.getByTestId('cancel-button'));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onProceed).not.toHaveBeenCalled();
    });

    it('calls proceedWithNonGenuine when Proceed Anyway is pressed', () => {
      renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      fireEvent.press(screen.getByTestId('proceed-button'));
      expect(onProceed).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('does not show the NFC icon area', () => {
      renderSheet(
        makeNfc('genuine_warning', { proceedWithNonGenuine: onProceed }),
      );
      expect(screen.queryByText('Tap your Keycard')).toBeNull();
    });
  });

  describe('pin_entry phase', () => {
    it('renders PinPad instead of the bottom sheet', () => {
      const submitPin = jest.fn();
      renderSheet(makeNfc('pin_entry', { submitPin }));
      expect(screen.getByTestId('pin-pad')).toBeTruthy();
    });

    it('does not show the NFC sheet content', () => {
      const submitPin = jest.fn();
      renderSheet(makeNfc('pin_entry', { submitPin }));
      expect(screen.queryByText('Tap your Keycard')).toBeNull();
    });
  });

  describe('pulse rings', () => {
    it('renders more elements when scanning than when done+showOnDone', () => {
      const { toJSON: scanningJSON } = renderSheet(makeNfc('nfc'));
      const { toJSON: successJSON } = renderSheet(makeNfc('done'), true);
      const scanningCount = JSON.stringify(scanningJSON()).length;
      const successCount = JSON.stringify(successJSON()).length;
      expect(scanningCount).toBeGreaterThan(successCount);
    });

    it('error has fewer elements than scanning (no pulse rings)', () => {
      const { toJSON: scanningJSON } = renderSheet(makeNfc('nfc'));
      const { toJSON: errorJSON } = renderSheet(makeNfc('error'));
      const scanningCount = JSON.stringify(scanningJSON()).length;
      const errorCount = JSON.stringify(errorJSON()).length;
      expect(errorCount).toBeLessThan(scanningCount);
    });
  });
});
