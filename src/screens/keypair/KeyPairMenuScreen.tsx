import { StyleSheet, View } from 'react-native';

import {
  DashboardAction,
  KeyPairMenuScreenProps,
} from '../../navigation/types';
import theme from '../../theme';

import Menu from '../../components/Menu';

export const dashboardEntry: DashboardAction = {
  label: 'Add Keypair',
  navigate: nav => nav.navigate('KeyPairMenu'),
};

export default function KeyPairMenuScreen({
  navigation,
}: KeyPairMenuScreenProps) {
  const entries = [
    {
      label: 'Import recovery phrase',
      onPress: () => navigation.navigate('ImportKey'),
    },
    {
      label: 'Generate new key pair',
      onPress: () => navigation.navigate('KeySize'),
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
