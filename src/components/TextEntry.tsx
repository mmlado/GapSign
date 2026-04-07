import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';

import theme from '../theme';
import PrimaryButton from './PrimaryButton';

type TextEntryProps = {
  onSubmit: (value: string) => void;
  error?: string;
  onType: () => void;
  /** Change this value to clear the input field (e.g. when switching entry steps) */
  resetKey?: string | number;
};

export default function TextEntry({
  onSubmit,
  error,
  onType,
  resetKey,
}: TextEntryProps) {
  const [value, setValue] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    setValue('');
  }, [resetKey]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (!value) {
      return;
    }
    onSubmit(value);
    setValue('');
  }, [value, onSubmit]);

  return (
    <View
      style={[
        styles.container,
        keyboardHeight > 0 && { paddingBottom: keyboardHeight + 8 },
      ]}
    >
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={text => {
            setValue(text);
            onType();
          }}
          secureTextEntry
          autoFocus
          placeholderTextColor={theme.colors.onSurfaceDisabled}
          placeholder="Pairing secret"
        />
        <Text style={[styles.error, !error && styles.errorHidden]}>
          {error ?? ''}
        </Text>
      </View>
      <PrimaryButton
        label="Continue"
        onPress={handleSubmit}
        disabled={!value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
    gap: 16,
    paddingBottom: 16,
  },
  field: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    backgroundColor: theme.colors.surfaceVariant,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.onSurface,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    color: theme.colors.onSurface,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  error: {
    color: theme.colors.errorDark,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    height: 20,
    paddingTop: 4,
  },
  errorHidden: {
    opacity: 0,
  },
});
