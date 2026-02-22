import React, {useCallback} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import theme from '../theme';
import type {QRResultScreenProps} from '../navigation/types';

export default function QRResultScreen({
  route,
  navigation,
}: QRResultScreenProps) {
  const insets = useSafeAreaInsets();
  const {urString, label} = route.params;

  const handleScanAnother = useCallback(() => {
    navigation.reset({index: 0, routes: [{name: 'QRScanner'}]});
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={urString}
              size={280}
              color="#000000"
              backgroundColor="#ffffff"
            />
          </View>
          {label ? (
            <Text variant="bodyMedium" style={styles.label}>
              {label}
            </Text>
          ) : null}
        </View>

        <View style={styles.urCard}>
          <Text variant="labelSmall" style={styles.urLabel}>
            UR DATA
          </Text>
          <Text variant="bodySmall" style={styles.urText} selectable>
            {urString}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
        <Pressable
          style={styles.button}
          android_ripple={{color: 'rgba(255,255,255,0.2)'}}
          onPress={handleScanAnother}>
          <Text variant="labelLarge" style={styles.buttonText}>
            Scan another transaction
          </Text>
        </Pressable>
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
  qrCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  label: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  urCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    gap: 4,
  },
  urLabel: {
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  urText: {
    color: theme.colors.onSurface,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 17,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
