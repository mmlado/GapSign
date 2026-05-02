import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import AddressText, { isDisplayAddress } from '../src/components/AddressText';
import theme from '../src/theme';

describe('AddressText', () => {
  it('recognizes Ethereum and Bitcoin addresses', () => {
    expect(isDisplayAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(
      true,
    );
    expect(isDisplayAddress('bc1qpncfjnresszndse506zmvjya05xcs6493cm8xf')).toBe(
      true,
    );
    expect(isDisplayAddress('0xa9059cbb')).toBe(false);
  });

  it('renders Ethereum addresses in alternating four-character chunks after the prefix', () => {
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const { UNSAFE_getAllByType } = render(<AddressText address={address} />);

    expect(screen.getByText(address)).toBeTruthy();

    const spans = UNSAFE_getAllByType(Text).filter(
      span => typeof span.props.children === 'string',
    );
    expect(spans.map(span => span.props.children)).toEqual([
      '0x',
      'd8dA',
      '6BF2',
      '6964',
      'aF9D',
      '7eEd',
      '9e03',
      'E534',
      '15D3',
      '7aA9',
      '6045',
    ]);
    expect(StyleSheet.flatten(spans[0].props.style).color).toBe(
      theme.colors.onSurfaceMuted,
    );
    expect(StyleSheet.flatten(spans[1].props.style).color).toBe(
      theme.colors.onSurface,
    );
    expect(StyleSheet.flatten(spans[2].props.style).color).toBe(
      theme.colors.onSurfaceSubtle,
    );
    expect(StyleSheet.flatten(spans[1].props.style).fontWeight).toBe('600');
    expect(
      StyleSheet.flatten(spans[1].props.style).backgroundColor,
    ).toBeUndefined();
    expect(StyleSheet.flatten(spans[2].props.style).fontWeight).toBeUndefined();
    expect(
      StyleSheet.flatten(spans[2].props.style).backgroundColor,
    ).toBeUndefined();
  });
});
