import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ConfirmPrompt from '../src/components/ConfirmPropmpt';

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

const onYes = jest.fn();
const onNo = jest.fn();

beforeEach(() => {
  onYes.mockClear();
  onNo.mockClear();
});

async function renderComponent() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ConfirmPrompt
        onYes={onYes}
        onNo={onNo}
        title={'Add a duress PIN?'}
        description={
          'A duress PIN unlocks the card but shows a decoy account. Use it if you are ever forced to access your wallet under pressure.'
        }
        yesLabel="Yes, add duress PIN"
        noLabel="No, skip"
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

describe('ConfirmPrompt', () => {
  describe('layout', () => {
    it('renders without crashing', async () => {
      await expect(renderComponent()).resolves.toBeDefined();
    });

    it('renders the title', async () => {
      const renderer = await renderComponent();
      expect(toJson(renderer)).toContain('Add a duress PIN?');
    });

    it('renders the Yes button', async () => {
      const renderer = await renderComponent();
      expect(toJson(renderer)).toContain('Yes, add duress PIN');
    });

    it('renders the No button', async () => {
      const renderer = await renderComponent();
      expect(toJson(renderer)).toContain('No, skip');
    });
  });

  describe('callbacks', () => {
    it('calls onYes when the Yes button is pressed', async () => {
      const renderer = await renderComponent();
      const [yesBtn] = getPressables(renderer);
      await act(async () => {
        yesBtn.props.onPress();
      });
      expect(onYes).toHaveBeenCalledTimes(1);
      expect(onNo).not.toHaveBeenCalled();
    });

    it('calls onNo when the No button is pressed', async () => {
      const renderer = await renderComponent();
      const pressables = getPressables(renderer);
      await act(async () => {
        pressables[2].props.onPress(); // index 2 = PrimaryButton(No)
      });
      expect(onNo).toHaveBeenCalledTimes(1);
      expect(onYes).not.toHaveBeenCalled();
    });
  });
});
