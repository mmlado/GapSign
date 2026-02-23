import React, {useCallback} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { DashboardScreenProps } from '../navigation/types';
import theme from '../theme';
import PrimaryButton from '../components/PrimaryButton';
import { Icons } from '../assets/icons';
import { dashboardActions } from '../navigation/dashboardActions';
import { Text } from 'react-native-paper';

export default function DashboardScreen({navigation}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();

  const handleSign = useCallback(() => {
    navigation.navigate('QRScanner');
  }, [navigation]);

  return (
    <View style={[styles.container, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.list}>
          {dashboardActions.map((action, i) => (
            <Pressable
              style={[styles.item, i < dashboardActions.length - 1 && styles.itemBorder]}
              key={i}
              onPress={action.onPress}>
              <Text style={styles.itemLabel}>
                {action.label}
              </Text>
              <Icons.chevronRight width={24} height={24} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.actions}>
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
    marginHorizontal: '3%',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  list: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF0D',
    width: '100%',
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 12,
    paddingLeft: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  itemLabel: {
    fontFamily: 'Inter_18pt-Medium',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 15 * 1.45,
    letterSpacing: -0.135,
    color: '#ffffff',
  },
});
