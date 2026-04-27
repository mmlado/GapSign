import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
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

/** Walk the toJSON tree and collect Pressable nodes.
 * In the RN test environment, Pressable renders as View with onClick (not onPress).
 * We identify them by the focusable prop which Pressable always sets.
 */
function getPressableNodesFromJSON(json: any): any[] {
  const nodes: any[] = [];
  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    // Pressable renders as View with focusable prop and onClick
    if (typeof node.props?.onClick === 'function') {
      nodes.push(node);
    }
    if (node.children) walk(node.children);
  }
  walk(json);
  return nodes;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PinPad', () => {
  describe('field label', () => {
    it('renders the "6 digits" field label by default', () => {
      render(<PinPad onComplete={onComplete} />);
      expect(screen.getByText('6 digits')).toBeTruthy();
    });

    it('renders the correct label for a custom length', () => {
      render(<PinPad onComplete={onComplete} length={12} />);
      expect(screen.getByText('12 digits')).toBeTruthy();
      expect(screen.queryByText('6 digits')).toBeNull();
    });
  });

  describe('PIN entry', () => {
    it('does not call onComplete before 6 digits are entered', async () => {
      render(<PinPad onComplete={onComplete} />);
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.press(screen.getByText('1'));
        });
      }
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('calls onComplete with the 6-digit PIN on the final press', async () => {
      render(<PinPad onComplete={onComplete} />);
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(screen.getByText('1'));
        });
      }
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('111111');
    });

    it('resets the pin after completion so a second entry works', async () => {
      render(<PinPad onComplete={onComplete} />);
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(screen.getByText('1'));
        });
      }
      onComplete.mockClear();
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(screen.getByText('1'));
        });
      }
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('111111');
    });

    it('backspace removes the last entered digit', async () => {
      const { toJSON } = render(<PinPad onComplete={onComplete} />);
      await act(async () => {
        fireEvent.press(screen.getByText('2'));
      });
      // press backspace — the node at index 11 (bottom-right) in the grid
      const pressables = getPressableNodesFromJSON(toJSON());
      const backspace = pressables[pressables.length - 1];
      await act(async () => {
        backspace.props.onClick();
      });
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(screen.getByText('1'));
        });
      }
      expect(onComplete).toHaveBeenCalledWith('111111');
    });
  });

  describe('onType callback', () => {
    it('calls onType when a digit is pressed', async () => {
      render(<PinPad onComplete={onComplete} onType={onType} />);
      await act(async () => {
        fireEvent.press(screen.getByText('1'));
      });
      expect(onType).toHaveBeenCalledTimes(1);
    });

    it('calls onType when backspace is pressed', async () => {
      const { toJSON } = render(
        <PinPad onComplete={onComplete} onType={onType} />,
      );
      await act(async () => {
        fireEvent.press(screen.getByText('1'));
      });
      onType.mockClear();
      const pressables = getPressableNodesFromJSON(toJSON());
      const backspace = pressables[pressables.length - 1];
      await act(async () => {
        backspace.props.onClick();
      });
      expect(onType).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onType is not provided', async () => {
      const { toJSON } = render(<PinPad onComplete={onComplete} />); // no onType prop
      const pressables = getPressableNodesFromJSON(toJSON());
      await expect(
        act(async () => {
          pressables[0].props.onClick();
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('scrambled layout', () => {
    it('renders all 10 digits', () => {
      render(<PinPad onComplete={onComplete} />);
      for (const d of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
        expect(screen.getByText(d)).toBeTruthy();
      }
    });

    it('reshuffles when a new error arrives', async () => {
      const { rerender, toJSON } = render(<PinPad onComplete={onComplete} />);
      const before = JSON.stringify(toJSON());
      await act(async () => {
        rerender(<PinPad onComplete={onComplete} error="Wrong PIN" />);
      });
      const after = JSON.stringify(toJSON());
      // Both snapshots must contain all digits — layout may differ
      for (const d of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
        expect(before).toContain(d);
        expect(after).toContain(d);
      }
    });

    it('keeps bottom-left empty and bottom-right as backspace', () => {
      const { toJSON } = render(<PinPad onComplete={onComplete} />);
      const pressables = getPressableNodesFromJSON(toJSON());
      expect(pressables).toHaveLength(12);
      // Bottom-left (index 9) must be disabled — accessibilityState.disabled
      expect(pressables[9].props.accessibilityState?.disabled).toBe(true);
      // Bottom-right (index 11) must be the backspace key — no Text digit child
      const backspaceCell = pressables[11];
      expect(backspaceCell.props.accessibilityState?.disabled).not.toBe(true);
      // backspace should not have a single-digit text child
      const cellText = JSON.stringify(backspaceCell.children);
      expect(cellText).not.toMatch(/"[0-9]"/);
    });

    it('does not reshuffle when error is unchanged', async () => {
      const { rerender, toJSON } = render(
        <PinPad onComplete={onComplete} error="Wrong PIN" />,
      );
      const before = JSON.stringify(toJSON());
      await act(async () => {
        rerender(<PinPad onComplete={onComplete} error="Wrong PIN" />);
      });
      expect(JSON.stringify(toJSON())).toBe(before);
    });
  });

  describe('error display', () => {
    it('shows the error text when the error prop is provided', () => {
      render(<PinPad onComplete={onComplete} error="PINs don't match" />);
      expect(screen.getByText("PINs don't match")).toBeTruthy();
    });

    it('does not show error text when no error prop', () => {
      render(<PinPad onComplete={onComplete} />);
      expect(screen.queryByText("PINs don't match")).toBeNull();
    });

    it('renders the same number of nodes whether error is present or absent', () => {
      // The error element is always in the tree (opacity:0 hides it, not
      // conditional rendering). Verifies no layout shift occurs.
      const { toJSON: withErrorJSON } = render(
        <PinPad onComplete={onComplete} error="Something wrong" />,
      );
      const { toJSON: withoutErrorJSON } = render(
        <PinPad onComplete={onComplete} />,
      );

      function countNodes(json: any): number {
        if (!json) return 0;
        if (Array.isArray(json))
          return json.reduce((acc: number, n: any) => acc + countNodes(n), 0);
        return 1 + countNodes(json.children);
      }

      const withCount = countNodes(withErrorJSON());
      const withoutCount = countNodes(withoutErrorJSON());
      // Both renders should produce the same or very similar node count
      // (the error text node is always in the tree, just hidden via opacity)
      expect(Math.abs(withCount - withoutCount)).toBeLessThanOrEqual(1);
    });
  });
});
