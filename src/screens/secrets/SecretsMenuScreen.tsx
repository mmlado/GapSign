import { StyleSheet, View } from 'react-native';

import {
  DashboardAction,
  SecretsMenuScreenProps,
} from '../../navigation/types';
import theme from '../../theme';

import Menu from '../../components/Menu';

export const dashboardEntry: DashboardAction = {
  label: 'Secrets',
  navigate: nav => nav.navigate('SecretsMenu'),
};

export default function SecretsMenuScreen({
  navigation,
}: SecretsMenuScreenProps) {
  const entries = [
    {
      label: 'Change PIN',
      onPress: () => navigation.navigate('ChangeSecret', { secretType: 'pin' }),
    },
    {
      label: 'Change PUK',
      onPress: () => navigation.navigate('ChangeSecret', { secretType: 'puk' }),
    },
    {
      label: 'Change Pairing Secret',
      onPress: () =>
        navigation.navigate('ChangeSecret', { secretType: 'pairing' }),
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
