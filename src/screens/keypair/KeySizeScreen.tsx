import { StyleSheet, View } from 'react-native';
import { KeySizeScreenProps } from '../../navigation/types';
import Menu from '../../components/Menu';
import theme from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function KeySizeScreen({ navigation }: KeySizeScreenProps) {
  const insets = useSafeAreaInsets();

  const entries = [
    {
      label: '12 word',
      onPress: () =>
        navigation.navigate('GenerateKey', {
          size: 12,
        }),
    },
    {
      label: '24 word',
      onPress: () =>
        navigation.navigate('GenerateKey', {
          size: 24,
        }),
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
