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
      onPress: () =>
        navigation.navigate('Keycard', {
          operation: 'export_key',
          derivationPath: "m/44'/60'/0'",
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
