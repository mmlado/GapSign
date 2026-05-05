import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Icons } from '../../assets/icons';
import theme from '../../theme';

type KeyProps = {
  value: string;
  onKey: (key: string) => void;
};

function Key({ value, onKey }: KeyProps) {
  const handlePress = useCallback(() => {
    onKey(value);
  }, [onKey, value]);
  const accessibilityLabel = value === '⌫' ? 'Backspace' : undefined;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.padKey,
        value === '' && styles.padKeyEmpty,
        pressed && value !== '' && styles.padKeyPressed,
      ]}
      onPress={handlePress}
      disabled={value === ''}
    >
      {value === '⌫' ? (
        <Icons.backspace width={24} height={24} />
      ) : (
        <Text style={styles.padKeyText}>{value}</Text>
      )}
    </Pressable>
  );
}

export default memo(Key);

const styles = StyleSheet.create({
  padKey: {
    flex: 1,
    height: 43,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  padKeyEmpty: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  padKeyPressed: {
    opacity: 0.6,
  },
  padKeyText: {
    color: theme.colors.onSurface,
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 30,
    lineHeight: 30,
    textAlign: 'center',
  },
});
