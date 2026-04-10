import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardAction, ExportKeyScreenProps } from '../navigation/types';
import theme from '../theme';
import Menu from '../components/Menu';

export const dashboardEntry: DashboardAction = {
  label: 'Connect software wallet',
  navigate: nav => nav.navigate('ExportKey'),
};

export default function ExportKeyScreen({ navigation }: ExportKeyScreenProps) {
  const insets = useSafeAreaInsets();

  const entries = [
    {
      label: 'Ethereum',
      requiresNfc: true,
      onPress: () =>
        navigation.navigate('Keycard', {
          operation: 'export_key',
          derivationPath: "m/44'/60'/0'",
        }),
    },
    {
      label: 'Bitcoin',
      requiresNfc: true,
      onPress: () =>
        navigation.navigate('Keycard', {
          operation: 'export_key',
          derivationPath: "m/84'/0'/0'",
        }),
    },
    {
      label: 'Bitcoin Multisig',
      requiresNfc: true,
      onPress: () =>
        navigation.navigate('Keycard', {
          operation: 'export_key',
          derivationPath: "m/48'/0'/0'/2'",
        }),
    },
    {
      label: 'Bitcoin Testnet',
      requiresNfc: true,
      onPress: () =>
        navigation.navigate('Keycard', {
          operation: 'export_key',
          derivationPath: "m/84'/1'/0'",
        }),
    },
    {
      label: 'Bitget',
      requiresNfc: true,
      onPress: () =>
        navigation.navigate('Keycard', {
          operation: 'export_key',
          derivationPath: 'bitget',
        }),
    },
    {
      label: 'Ledger Live',
      requiresNfc: true,
      onPress: () =>
        navigation.navigate('Keycard', {
          operation: 'export_key',
          derivationPath: "m/44'/60'/0'",
          source: 'account.ledger_live',
        }),
    },
    {
      label: 'Ledger Legacy',
      requiresNfc: true,
      onPress: () =>
        navigation.navigate('Keycard', {
          operation: 'export_key',
          derivationPath: "m/44'/60'/0'",
          source: 'account.ledger_legacy',
        }),
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Menu entries={entries} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
