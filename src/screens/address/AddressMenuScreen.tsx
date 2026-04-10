import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AddressMenuScreenProps,
  DashboardAction,
} from '../../navigation/types';
import Menu from '../../components/Menu';
import theme from '../../theme';

export const dashboardEntry: DashboardAction = {
  label: 'Addresses',
  navigate: nav => nav.navigate('AddressMenu'),
};

export default function AddressesMenuScreen({
  navigation,
}: AddressMenuScreenProps) {
  const insets = useSafeAreaInsets();

  const entries = [
    {
      label: 'Ethereum',
      requiresNfc: true,
      onPress: () => navigation.navigate('AddressList', { coin: 'eth' }),
    },
    {
      label: 'Bitcoin',
      requiresNfc: true,
      onPress: () => navigation.navigate('AddressList', { coin: 'btc' }),
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
