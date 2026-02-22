import React, {useCallback} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { DashboardScreenProps } from '../navigation/types';
import theme from '../theme';
import PrimaryButton from '../components/PrimaryButton';
import { Icons } from '../assets/icons';

export default function DashboardScreen({navigation}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();

  const handleSign = useCallback(() => {
    navigation.navigate('QRScanner');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
      </ScrollView>

      <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
        <PrimaryButton label='Scan transaction' onPress={handleSign} icon={Icons.scan} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
  },
});
