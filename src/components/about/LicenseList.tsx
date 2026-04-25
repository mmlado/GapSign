import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icons } from '../../assets/icons';
import theme from '../../theme';

import { type LicenseEntry, licenses } from '../../data/licenses';

type LicenseListProps = {
  onSelectLicense: (entry: LicenseEntry) => void;
};

export default function LicenseList({ onSelectLicense }: LicenseListProps) {
  return (
    <View style={styles.list}>
      {licenses.map((entry, index) => (
        <Pressable
          key={entry.package}
          style={[styles.row, index < licenses.length - 1 && styles.rowBorder]}
          onPress={() => onSelectLicense(entry)}
        >
          <View style={styles.licenseRowLeft}>
            <Text style={styles.rowLabel}>{entry.package}</Text>
            <Text style={styles.licenseType}>{entry.licenseType}</Text>
          </View>
          <Icons.chevronRight width={24} height={24} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceList,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  rowLabel: {
    fontFamily: 'Inter_18pt-Medium',
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  licenseRowLeft: {
    gap: 2,
  },
  licenseType: {
    fontSize: 12,
    color: theme.colors.onSurfaceMuted,
  },
});
