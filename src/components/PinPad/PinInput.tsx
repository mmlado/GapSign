import { StyleSheet, Text, View } from 'react-native';

import theme from '../../theme';

import Caret from './Caret';

type PinInputProps = {
  enteredLength: number;
  error?: string;
  length: number;
};

export default function PinInput({
  enteredLength,
  error,
  length,
}: PinInputProps) {
  return (
    <View style={styles.header}>
      <View style={styles.fieldWrapper}>
        <View style={styles.pinField}>
          <Text style={styles.pinFieldLabel}>{`${length} digits`}</Text>
          <View style={styles.pinFieldRow}>
            <Text style={styles.pinFieldText}>{'•'.repeat(enteredLength)}</Text>
            <Caret />
          </View>
        </View>
        <Text style={[styles.error, !error && styles.errorHidden]}>
          {error ?? ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  fieldWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinField: {
    width: '66%',
    backgroundColor: theme.colors.surfaceVariant,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.onSurface,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 4,
  },
  pinFieldLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  pinFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  pinFieldText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    letterSpacing: 4,
  },
  error: {
    color: theme.colors.errorDark,
    fontWeight: '400',
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
