import { StyleSheet, Text, View } from 'react-native';

import theme from '../../theme';

import DonationList from './DonationList';

type DonationSectionProps = {
  onShowQR: (label: string, address: string) => void;
};

export default function DonationSection({ onShowQR }: DonationSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Support development</Text>
      <Text style={styles.description}>
        Donations help keep GapSign maintained and available as open-source
        software.
      </Text>
      <DonationList onShowQR={onShowQR} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 18,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  description: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
