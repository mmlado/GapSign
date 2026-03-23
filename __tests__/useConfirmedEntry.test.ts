import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {
  useConfirmedEntry,
  UseConfirmedEntry,
} from '../src/hooks/useConfirmedEntry';

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

let latestHook: UseConfirmedEntry;
const onComplete = jest.fn();

function TestHook({ length }: { length?: number }) {
  latestHook = useConfirmedEntry(onComplete, { length });
  return null;
}

async function mountHook(length?: number) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      React.createElement(TestHook, { length }),
    );
  });
  return renderer;
}

beforeEach(() => {
  onComplete.mockClear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useConfirmedEntry', () => {
  describe('initial state', () => {
    it('starts on the entry step', async () => {
      await mountHook();
      expect(latestHook.step).toBe('entry');
    });

    it('has no error initially', async () => {
      await mountHook();
      expect(latestHook.error).toBeUndefined();
    });

    it('defaults length to 6', async () => {
      await mountHook();
      expect(latestHook.length).toBe(6);
    });

    it('uses a custom length when provided', async () => {
      await mountHook(12);
      expect(latestHook.length).toBe(12);
    });
  });

  describe('handleEntry', () => {
    it('advances to confirm step', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
      });
      expect(latestHook.step).toBe('confirm');
    });
  });

  describe('handleConfirm', () => {
    it('calls onComplete when values match', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
      });
      await act(async () => {
        latestHook.handleConfirm('123456');
      });
      expect(onComplete).toHaveBeenCalledWith('123456');
      expect(latestHook.error).toBeUndefined();
    });

    it('sets error when values do not match', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
      });
      await act(async () => {
        latestHook.handleConfirm('999999');
      });
      expect(onComplete).not.toHaveBeenCalled();
      expect(latestHook.error).toBe("PINs don't match");
    });

    it('does not clear the stored value on match (allows jumpToConfirm re-use)', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
      });
      await act(async () => {
        latestHook.handleConfirm('123456');
      });
      // jumpToConfirm and confirm again — should still match
      await act(async () => {
        latestHook.jumpToConfirm();
      });
      await act(async () => {
        latestHook.handleConfirm('123456');
      });
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('goBack', () => {
    it('returns false on the entry step (not handled)', async () => {
      await mountHook();
      let result!: boolean;
      await act(async () => {
        result = latestHook.goBack();
      });
      expect(result).toBe(false);
      expect(latestHook.step).toBe('entry');
    });

    it('returns true and goes back to entry from confirm', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
      });
      let result!: boolean;
      await act(async () => {
        result = latestHook.goBack();
      });
      expect(result).toBe(true);
      expect(latestHook.step).toBe('entry');
    });

    it('clears the error when going back', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
      });
      await act(async () => {
        latestHook.handleConfirm('999999'); // mismatch → error
      });
      await act(async () => {
        latestHook.goBack();
      });
      expect(latestHook.error).toBeUndefined();
    });
  });

  describe('jumpToConfirm', () => {
    it('moves to confirm step and clears error', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
        latestHook.handleConfirm('999999'); // create error
      });
      await act(async () => {
        latestHook.goBack(); // back to entry
        latestHook.jumpToConfirm();
      });
      expect(latestHook.step).toBe('confirm');
      expect(latestHook.error).toBeUndefined();
    });
  });

  describe('clearError', () => {
    it('clears a mismatch error', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
        latestHook.handleConfirm('999999');
      });
      expect(latestHook.error).toBeDefined();
      await act(async () => {
        latestHook.clearError();
      });
      expect(latestHook.error).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('goes back to entry step with no error', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
        latestHook.handleConfirm('999999');
      });
      await act(async () => {
        latestHook.reset();
      });
      expect(latestHook.step).toBe('entry');
      expect(latestHook.error).toBeUndefined();
    });

    it('clears stored value so a subsequent confirm fails', async () => {
      await mountHook();
      await act(async () => {
        latestHook.handleEntry('123456');
      });
      await act(async () => {
        latestHook.reset();
      });
      await act(async () => {
        latestHook.handleEntry('654321');
        latestHook.handleConfirm('123456'); // original value, should fail
      });
      expect(onComplete).not.toHaveBeenCalled();
      expect(latestHook.error).toBe("PINs don't match");
    });
  });
});
