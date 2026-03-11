import { StyleSheet, View } from 'react-native';
import theme from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmKeySreenProps } from '../../navigation/types';

export default function ConfirmKeyScreen({}: ConfirmKeySreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
