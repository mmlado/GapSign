import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

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

function renderComponent() {
  return render(
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
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfirmPrompt', () => {
  describe('layout', () => {
    it('renders without crashing', () => {
      expect(() => renderComponent()).not.toThrow();
    });

    it('renders the title', () => {
      renderComponent();
      expect(screen.getByText('Add a duress PIN?')).toBeTruthy();
    });

    it('renders the Yes button', () => {
      renderComponent();
      expect(screen.getByText('Yes, add duress PIN')).toBeTruthy();
    });

    it('renders the No button', () => {
      renderComponent();
      expect(screen.getByText('No, skip')).toBeTruthy();
    });
  });

  describe('callbacks', () => {
    it('calls onYes when the Yes button is pressed', () => {
      renderComponent();
      fireEvent.press(screen.getByText('Yes, add duress PIN'));
      expect(onYes).toHaveBeenCalledTimes(1);
      expect(onNo).not.toHaveBeenCalled();
    });

    it('calls onNo when the No button is pressed', () => {
      renderComponent();
      fireEvent.press(screen.getByText('No, skip'));
      expect(onNo).toHaveBeenCalledTimes(1);
      expect(onYes).not.toHaveBeenCalled();
    });
  });
});
