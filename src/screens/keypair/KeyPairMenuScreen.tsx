import { StyleSheet, View } from 'react-native';

import {
  DashboardAction,
  KeyPairMenuScreenProps,
} from '../../navigation/types';
import theme from '../../theme';

import Menu from '../../components/Menu';

export const dashboardEntry: DashboardAction = {
  label: 'Keypair',
  navigate: nav => nav.navigate('KeyPairMenu'),
};

export default function KeyPairMenuScreen({
  navigation,
}: KeyPairMenuScreenProps) {
  const entries = [
    {
      label: 'Generate BIP39 key pair',
      onPress: () => navigation.navigate('KeySize'),
    },
    {
      label: 'Import BIP39 recovery phrase',
      onPress: () => navigation.navigate('Mnemonic'),
    },
    {
      label: 'Verify BIP39 recovery phrase',
      onPress: () => navigation.navigate('Mnemonic', { mode: 'verify' }),
    },
    {
      label: 'Generate SLIP39 shares',
      onPress: () => navigation.navigate('Slip39', { mode: 'generate' }),
    },
    {
      label: 'Import SLIP39 shares',
      onPress: () => navigation.navigate('Slip39', { mode: 'import' }),
    },
    {
      label: 'Verify SLIP39 shares',
      onPress: () => navigation.navigate('Slip39', { mode: 'verify' }),
    },
  ];
  return (
    <View style={styles.container}>
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
