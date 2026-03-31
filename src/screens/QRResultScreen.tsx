import React, { useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import AnimatedURQRCode from 'react-native-animated-ur-qr';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { QRResultScreenProps } from '../navigation/types';
import theme from '../theme';
import PrimaryButton from '../components/PrimaryButton';

const QR_PADDING = 24;

export default function QRResultScreen({
  route,
  navigation,
}: QRResultScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { urString } = route.params;
  const qrSize = width - QR_PADDING * 2 - 12 * 2;

  const handleDone = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.qrArea}>
        <AnimatedURQRCode urString={urString} size={qrSize} />
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Done" onPress={handleDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  qrArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
