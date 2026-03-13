import { StyleSheet, View } from 'react-native';
import {
  AddressMenuScreenProps,
  DashboardAction,
} from '../../navigation/types';
import Menu from '../../components/Menu';
import theme from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      onPress: () => navigation.navigate('AddressList', { coin: 'eth' }),
    },
    {
      label: 'Bitcoin',
      onPress: () => navigation.navigate('AddressList', { coin: 'btc' }),
    },
  ];
  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
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
