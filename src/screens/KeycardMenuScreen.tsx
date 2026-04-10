import { StyleSheet, View } from 'react-native';

import { DashboardAction, KeycardMenuScreenProps } from '../navigation/types';
import Menu from '../components/Menu';
import theme from '../theme';

export const dashboardEntry: DashboardAction = {
  label: 'Keycard',
  navigate: nav => nav.navigate('KeycardMenu'),
};

export default function KeycardMenuScreen({
  navigation,
}: KeycardMenuScreenProps) {
  const entries = [
    {
      label: 'Initialize',
      requiresNfc: true,
      onPress: () => navigation.navigate('InitCard'),
    },
    {
      label: 'Keypair',
      onPress: () => navigation.navigate('KeyPairMenu'),
    },
    {
      label: 'Secrets',
      onPress: () => navigation.navigate('SecretsMenu'),
    },
    {
      label: 'Factory reset',
      onPress: () => navigation.navigate('FactoryReset'),
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
