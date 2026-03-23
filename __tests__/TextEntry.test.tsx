import React, { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';

import TextEntry from '../src/components/TextEntry';

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

const onSubmit = jest.fn();
const onType = jest.fn();

async function renderEntry(
  props: Partial<React.ComponentProps<typeof TextEntry>> = {},
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <TextEntry onSubmit={onSubmit} onType={onType} {...props} />,
    );
  });
  return renderer;
}

function getInput(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find((n: any) => n.type === 'TextInput');
}

function getContinueButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    (n: any) =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.disabled === 'boolean',
  );
}

async function typeValue(
  renderer: ReactTestRenderer.ReactTestRenderer,
  value: string,
) {
  await act(async () => {
    getInput(renderer).props.onChangeText(value);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TextEntry', () => {
  beforeEach(() => {
    onSubmit.mockClear();
    onType.mockClear();
  });

  it('renders a TextInput', async () => {
    const renderer = await renderEntry();
    expect(getInput(renderer)).toBeTruthy();
  });

  it('Continue button is disabled when value is empty', async () => {
    const renderer = await renderEntry();
    const btn = getContinueButton(renderer);
    expect(btn!.props.disabled).toBe(true);
  });

  it('Continue button is enabled after typing', async () => {
    const renderer = await renderEntry();
    await typeValue(renderer, 'secret');
    const btn = getContinueButton(renderer);
    expect(btn!.props.disabled).toBe(false);
  });

  it('calls onSubmit with the typed value when Continue is pressed', async () => {
    const renderer = await renderEntry();
    await typeValue(renderer, 'mysecret');
    await act(async () => {
      getContinueButton(renderer)!.props.onPress();
    });
    expect(onSubmit).toHaveBeenCalledWith('mysecret');
  });

  it('clears the field after submit', async () => {
    const renderer = await renderEntry();
    await typeValue(renderer, 'mysecret');
    await act(async () => {
      getContinueButton(renderer)!.props.onPress();
    });
    expect(getInput(renderer).props.value).toBe('');
  });

  it('does not call onSubmit when value is empty', async () => {
    const renderer = await renderEntry();
    await act(async () => {
      getContinueButton(renderer)!.props.onPress();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onType when text changes', async () => {
    const renderer = await renderEntry();
    await typeValue(renderer, 'x');
    expect(onType).toHaveBeenCalled();
  });

  it('clears the value when resetKey changes', async () => {
    const renderer = await renderEntry({ resetKey: 'entry' });
    await typeValue(renderer, 'typed');
    expect(getInput(renderer).props.value).toBe('typed');
    await act(async () => {
      renderer.update(
        <TextEntry onSubmit={onSubmit} onType={onType} resetKey="confirm" />,
      );
    });
    expect(getInput(renderer).props.value).toBe('');
  });

  it('shows the error when provided', async () => {
    const renderer = await renderEntry({ error: 'Secrets do not match' });
    expect(JSON.stringify(renderer.toJSON())).toContain('Secrets do not match');
  });
});
