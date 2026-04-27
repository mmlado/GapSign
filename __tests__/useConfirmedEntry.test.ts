import { act, renderHook } from '@testing-library/react-native';

import { useConfirmedEntry } from '../src/hooks/useConfirmedEntry';

const onComplete = jest.fn();

beforeEach(() => {
  onComplete.mockClear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useConfirmedEntry', () => {
  describe('initial state', () => {
    it('starts on the entry step', () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      expect(result.current.step).toBe('entry');
    });

    it('has no error initially', () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      expect(result.current.error).toBeUndefined();
    });

    it('defaults length to 6', () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      expect(result.current.length).toBe(6);
    });

    it('uses a custom length when provided', () => {
      const { result } = renderHook(() =>
        useConfirmedEntry(onComplete, { length: 12 }),
      );
      expect(result.current.length).toBe(12);
    });
  });

  describe('handleEntry', () => {
    it('advances to confirm step', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
      });
      expect(result.current.step).toBe('confirm');
    });
  });

  describe('handleConfirm', () => {
    it('calls onComplete when values match', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
      });
      await act(async () => {
        result.current.handleConfirm('123456');
      });
      expect(onComplete).toHaveBeenCalledWith('123456');
      expect(result.current.error).toBeUndefined();
    });

    it('sets error when values do not match', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
      });
      await act(async () => {
        result.current.handleConfirm('999999');
      });
      expect(onComplete).not.toHaveBeenCalled();
      expect(result.current.error).toBe("PINs don't match");
    });

    it('does not clear the stored value on match (allows jumpToConfirm re-use)', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
      });
      await act(async () => {
        result.current.handleConfirm('123456');
      });
      // jumpToConfirm and confirm again — should still match
      await act(async () => {
        result.current.jumpToConfirm();
      });
      await act(async () => {
        result.current.handleConfirm('123456');
      });
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('goBack', () => {
    it('returns false on the entry step (not handled)', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      let returnVal!: boolean;
      await act(async () => {
        returnVal = result.current.goBack();
      });
      expect(returnVal).toBe(false);
      expect(result.current.step).toBe('entry');
    });

    it('returns true and goes back to entry from confirm', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
      });
      let returnVal!: boolean;
      await act(async () => {
        returnVal = result.current.goBack();
      });
      expect(returnVal).toBe(true);
      expect(result.current.step).toBe('entry');
    });

    it('clears the error when going back', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
      });
      await act(async () => {
        result.current.handleConfirm('999999'); // mismatch → error
      });
      await act(async () => {
        result.current.goBack();
      });
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('jumpToConfirm', () => {
    it('moves to confirm step and clears error', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
        result.current.handleConfirm('999999'); // create error
      });
      await act(async () => {
        result.current.goBack(); // back to entry
        result.current.jumpToConfirm();
      });
      expect(result.current.step).toBe('confirm');
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('clearError', () => {
    it('clears a mismatch error', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
        result.current.handleConfirm('999999');
      });
      expect(result.current.error).toBeDefined();
      await act(async () => {
        result.current.clearError();
      });
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('goes back to entry step with no error', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
        result.current.handleConfirm('999999');
      });
      await act(async () => {
        result.current.reset();
      });
      expect(result.current.step).toBe('entry');
      expect(result.current.error).toBeUndefined();
    });

    it('clears stored value so a subsequent confirm fails', async () => {
      const { result } = renderHook(() => useConfirmedEntry(onComplete, {}));
      await act(async () => {
        result.current.handleEntry('123456');
      });
      await act(async () => {
        result.current.reset();
      });
      await act(async () => {
        result.current.handleEntry('654321');
        result.current.handleConfirm('123456'); // original value, should fail
      });
      expect(onComplete).not.toHaveBeenCalled();
      expect(result.current.error).toBe("PINs don't match");
    });
  });
});
