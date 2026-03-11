import { StyleSheet, View } from 'react-native';
import {
  DashboardAction,
  KeyPairMenuScreenProps,
} from '../../navigation/types';
import Menu from '../../components/Menu';
import theme from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const dashboardEntry: DashboardAction = {
  label: 'Add Keypair',
  navigate: nav => nav.navigate('KeyPairMenu'),
};

export default function KeyPairMenuScreen({
  navigation,
}: KeyPairMenuScreenProps) {
  const insets = useSafeAreaInsets();

  const entries = [
    {
      label: 'Generate new keypair',
      onPress: () => navigation.navigate('KeySize'),
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
