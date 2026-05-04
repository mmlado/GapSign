import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import CameraView from '../src/components/CameraView';

jest.mock('../src/components/Camera', () => ({
  Camera: ({ onReadCode }: any) => {
    const { View } = require('react-native');
    return <View testID="camera" onReadCode={onReadCode} />;
  },
}));

describe('CameraView', () => {
  it('renders the camera', () => {
    render(<CameraView onReadCode={jest.fn()} />);
    expect(screen.getByTestId('camera')).toBeTruthy();
  });

  it('passes onReadCode to Camera', () => {
    const handler = jest.fn();
    render(<CameraView onReadCode={handler} />);
    expect(screen.getByTestId('camera').props.onReadCode).toBe(handler);
  });

  it('renders children', () => {
    render(
      <CameraView onReadCode={jest.fn()}>
        <Text>overlay</Text>
      </CameraView>,
    );
    expect(screen.getByText('overlay')).toBeTruthy();
  });
});
