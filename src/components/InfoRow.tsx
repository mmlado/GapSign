import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import theme from '../theme';

import AddressText, { isDisplayAddress } from './AddressText';

export default function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySmall" style={styles.infoLabel}>
        {label}
      </Text>
      {isDisplayAddress(value) ? (
        <AddressText address={value} style={styles.infoValue} selectable />
      ) : (
        <Text variant="bodyMedium" style={styles.infoValue} selectable>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: theme.colors.onSurfaceVariant,
  },
  infoValue: {
    color: theme.colors.onSurface,
    fontFamily: 'monospace',
    fontSize: 14,
  },
});
