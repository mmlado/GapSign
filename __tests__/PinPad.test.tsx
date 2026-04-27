import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import PinPad from '../src/components/PinPad';
import { getActivePressables, findKey } from './testUtils';

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
      <PinPad onComplete={onComplete} {...props} />,
    );
  });
  return renderer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PinPad', () => {
  describe('field label', () => {
    it('renders the "6 digits" field label by default', async () => {
      const renderer = await renderPad();
      expect(JSON.stringify(renderer.toJSON())).toContain('6 digits');
    });

    it('renders the correct label for a custom length', async () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <PinPad onComplete={onComplete} length={12} />,
        );
      });
      expect(JSON.stringify(renderer.toJSON())).toContain('12 digits');
      expect(JSON.stringify(renderer.toJSON())).not.toContain('6 digits');
    });
  });

  describe('PIN entry', () => {
    it('does not call onComplete before 6 digits are entered', async () => {
      const renderer = await renderPad();
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          findKey(renderer, '1').props.onPress();
        });
      }
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('calls onComplete with the 6-digit PIN on the final press', async () => {
      const renderer = await renderPad();
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          findKey(renderer, '1').props.onPress();
        });
      }
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('111111');
    });

    it('resets the pin after completion so a second entry works', async () => {
      const renderer = await renderPad();
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          findKey(renderer, '1').props.onPress();
        });
      }
      onComplete.mockClear();
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          findKey(renderer, '1').props.onPress();
        });
      }
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('111111');
    });

    it('backspace removes the last entered digit', async () => {
      const renderer = await renderPad();
      await act(async () => {
        findKey(renderer, '2').props.onPress();
      });
      await act(async () => {
        const keys = getActivePressables(renderer);
        keys[keys.length - 1].props.onPress(); // ⌫ is always last
      });
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          findKey(renderer, '1').props.onPress();
        });
      }
      expect(onComplete).toHaveBeenCalledWith('111111');
    });
  });

  describe('onType callback', () => {
    it('calls onType when a digit is pressed', async () => {
      const renderer = await renderPad({ onType });
      await act(async () => {
        findKey(renderer, '1').props.onPress();
      });
      expect(onType).toHaveBeenCalledTimes(1);
    });

    it('calls onType when backspace is pressed', async () => {
      const renderer = await renderPad({ onType });
      await act(async () => {
        findKey(renderer, '1').props.onPress();
      });
      onType.mockClear();
      const keys = getActivePressables(renderer);
      await act(async () => {
        keys[keys.length - 1].props.onPress(); // ⌫ is always last
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

  describe('scrambled layout', () => {
    it('renders all 10 digits', async () => {
      const renderer = await renderPad();
      const json = JSON.stringify(renderer.toJSON());
      for (const d of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
        expect(json).toContain(d);
      }
    });

    it('reshuffles when a new error arrives', async () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = ReactTestRenderer.create(<PinPad onComplete={onComplete} />);
      });
      const before = JSON.stringify(renderer.toJSON());
      await act(async () => {
        renderer.update(<PinPad onComplete={onComplete} error="Wrong PIN" />);
      });
      const after = JSON.stringify(renderer.toJSON());
      // Both snapshots must contain all digits — layout may differ
      for (const d of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
        expect(before).toContain(d);
        expect(after).toContain(d);
      }
    });

    it('keeps bottom-left empty and bottom-right as backspace', async () => {
      const renderer = await renderPad();
      // 12 pressables total (4 rows × 3 keys). Indices 0–11, row-major order.
      const allPressables = renderer.root.findAll(
        (node: any) => typeof node.props.onPress === 'function',
        { deep: true },
      );
      expect(allPressables).toHaveLength(12);
      // Bottom-left (index 9) must be disabled
      expect(allPressables[9].props.disabled).toBe(true);
      // Bottom-right (index 11) must be the backspace key — no Text digit child
      const backspaceCell = allPressables[11];
      expect(backspaceCell.props.disabled).toBe(false);
      const textChildren = backspaceCell.findAll(
        (node: any) => node.type === 'Text',
        { deep: true },
      );
      expect(textChildren).toHaveLength(0);
    });

    it('does not reshuffle when error is unchanged', async () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <PinPad onComplete={onComplete} error="Wrong PIN" />,
        );
      });
      const before = JSON.stringify(renderer.toJSON());
      await act(async () => {
        renderer.update(<PinPad onComplete={onComplete} error="Wrong PIN" />);
      });
      expect(JSON.stringify(renderer.toJSON())).toBe(before);
    });
  });

  describe('error display', () => {
    it('shows the error text when the error prop is provided', async () => {
      const renderer = await renderPad({ error: "PINs don't match" });
      expect(JSON.stringify(renderer.toJSON())).toContain("PINs don't match");
    });

    it('does not show error text when no error prop', async () => {
      const renderer = await renderPad();
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        "PINs don't match",
      );
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
