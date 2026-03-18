import { StyleSheet, View } from 'react-native';
import { KeySizeScreenProps } from '../../navigation/types';
import Menu from '../../components/Menu';
import theme from '../../theme';
export default function KeySizeScreen({ navigation }: KeySizeScreenProps) {
  const entries = [
    {
      label: '12 word',
      onPress: () =>
        navigation.navigate('GenerateKey', {
          size: 12,
        }),
    },
    {
      label: '12 word + passphrase',
      onPress: () =>
        navigation.navigate('GenerateKey', {
          size: 12,
          passphrase: true,
        }),
    },
    {
      label: '24 word',
      onPress: () =>
        navigation.navigate('GenerateKey', {
          size: 24,
        }),
    },
    {
      label: '24 word + passphrase',
      onPress: () =>
        navigation.navigate('GenerateKey', {
          size: 24,
          passphrase: true,
        }),
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
