import React, { useCallback, useLayoutEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import theme from '../theme';
import type { QRResultScreenProps } from '../navigation/types';
import PrimaryButton from '../components/PrimaryButton';

export default function QRResultScreen({
  route,
  navigation,
}: QRResultScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { urString } = route.params;
  const QR_PADDING = 24;
  const qrSize = width - QR_PADDING * 2 - 12 * 2; // screen padding + qrWrapper padding

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Scan QR code' });
  }, [navigation]);

  const handleDone = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.qrArea}>
        <View style={[styles.qrWrapper, { margin: QR_PADDING }]}>
          <QRCode
            value={urString}
            size={qrSize}
            color="#000000"
            backgroundColor="#ffffff"
          />
        </View>
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
  qrWrapper: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
