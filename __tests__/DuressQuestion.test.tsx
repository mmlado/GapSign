import React, {act} from 'react';
import ReactTestRenderer from 'react-test-renderer';
import DuressQuestion from '../src/components/DuressQuestion';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native-paper', () => {
  const {Text} = require('react-native');
  return {MD3DarkTheme: {colors: {}}, Text};
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
      <DuressQuestion onYes={onYes} onNo={onNo} />,
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
    {deep: true},
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DuressQuestion', () => {
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
