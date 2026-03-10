import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import PinPad from '../src/components/PinPad';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return { MD3DarkTheme: { colors: {} }, Text };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const onComplete = jest.fn();
const onType = jest.fn();

beforeEach(() => {
  onComplete.mockClear();
  onType.mockClear();
});

async function renderPad(props?: { error?: string; onType?: () => void }) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <PinPad title="Enter PIN" onComplete={onComplete} {...props} />,
    );
  });
  return renderer;
}

function toJson(r: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(r.toJSON());
}

function getActivePressables(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    (node: any) =>
      typeof node.props.onPress === 'function' && !node.props.disabled,
    { deep: true },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PinPad', () => {
  describe('title', () => {
    it('renders the provided title', async () => {
      const renderer = await renderPad();
      expect(toJson(renderer)).toContain('Enter PIN');
    });
  });

  describe('PIN entry', () => {
    it('does not call onComplete before 6 digits are entered', async () => {
      const renderer = await renderPad();
      const keys = getActivePressables(renderer);
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          keys[0].props.onPress(); // '1' × 5
        });
      }
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('calls onComplete with the 6-digit PIN on the final press', async () => {
      const renderer = await renderPad();
      for (let i = 0; i < 6; i++) {
        const keys = getActivePressables(renderer);
        await act(async () => {
          keys[0].props.onPress(); // '1' × 6
        });
      }
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('111111');
    });

    it('resets the pin after completion so a second entry works', async () => {
      const renderer = await renderPad();
      for (let i = 0; i < 6; i++) {
        const keys = getActivePressables(renderer);
        await act(async () => {
          keys[0].props.onPress();
        });
      }
      onComplete.mockClear();
      for (let i = 0; i < 6; i++) {
        const keys = getActivePressables(renderer);
        await act(async () => {
          keys[0].props.onPress();
        });
      }
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('111111');
    });

    it('backspace removes the last entered digit', async () => {
      const renderer = await renderPad();
      // Press '2', then backspace, then '1' × 6 → should yield '111111'
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
      expect(onComplete).toHaveBeenCalledWith('111111');
    });
  });

  describe('onType callback', () => {
    it('calls onType when a digit is pressed', async () => {
      const renderer = await renderPad({ onType });
      const keys = getActivePressables(renderer);
      await act(async () => {
        keys[0].props.onPress(); // '1'
      });
      expect(onType).toHaveBeenCalledTimes(1);
    });

    it('calls onType when backspace is pressed', async () => {
      const renderer = await renderPad({ onType });
      await act(async () => {
        getActivePressables(renderer)[0].props.onPress(); // enter '1' first
      });
      onType.mockClear();
      const keys = getActivePressables(renderer);
      await act(async () => {
        keys[keys.length - 1].props.onPress(); // '⌫'
      });
      expect(onType).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onType is not provided', async () => {
      const renderer = await renderPad(); // no onType prop
      const keys = getActivePressables(renderer);
      await expect(
        act(async () => {
          keys[0].props.onPress();
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('error display', () => {
    it('shows the error text when the error prop is provided', async () => {
      const renderer = await renderPad({ error: "PINs don't match" });
      expect(toJson(renderer)).toContain("PINs don't match");
    });

    it('does not show error text when no error prop', async () => {
      const renderer = await renderPad();
      expect(toJson(renderer)).not.toContain("PINs don't match");
    });

    it('renders the same number of nodes whether error is present or absent', async () => {
      // The error element is always in the tree (opacity:0 hides it, not
      // conditional rendering). Verifies no layout shift occurs.
      function countNodes(r: ReactTestRenderer.ReactTestRenderer) {
        return r.root.findAll(() => true, { deep: true }).length;
      }
      const withError = await renderPad({ error: 'Something wrong' });
      const withoutError = await renderPad();
      expect(countNodes(withError)).toBe(countNodes(withoutError));
    });
  });
});
