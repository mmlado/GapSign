import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Text } from 'react-native-paper';
import { URDecoder, UREncoder } from '@ngraveio/bc-ur';
import theme from '../theme';
import type { QRResultScreenProps } from '../navigation/types';
import PrimaryButton from '../components/PrimaryButton';

const QR_FRAME_DURATION = 200;
const QR_MAX_SEGMENT_LENGTH = 200;

export default function QRResultScreen({
  route,
  navigation,
}: QRResultScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { urString } = route.params;
  const QR_PADDING = 24;
  const qrSize = width - QR_PADDING * 2 - 12 * 2;

  const [animatedValue, setAnimatedValue] = useState(urString);
  const [fragmentCount, setFragmentCount] = useState(1);

  const encoder = useMemo(() => {
    try {
      const decoder = new URDecoder();
      decoder.receivePart(urString);
      if (!decoder.isSuccess()) {
        return null;
      }

      const nextEncoder = new UREncoder(
        decoder.resultUR(),
        QR_MAX_SEGMENT_LENGTH,
      );
      return nextEncoder.fragmentsLength > 1 ? nextEncoder : null;
    } catch {
      return null;
    }
  }, [urString]);

  useEffect(() => {
    if (!encoder) {
      setAnimatedValue(urString);
      setFragmentCount(1);
      return;
    }

    setFragmentCount(encoder.fragmentsLength);
    setAnimatedValue(encoder.nextPart());

    const interval = setInterval(() => {
      setAnimatedValue(encoder.nextPart());
    }, QR_FRAME_DURATION);

    return () => clearInterval(interval);
  }, [encoder, urString]);

  const handleDone = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.qrArea}>
        <View style={[styles.qrWrapper, { margin: QR_PADDING }]}>
          <QRCode
            value={animatedValue}
            size={qrSize}
            color="#000000"
            backgroundColor="#ffffff"
          />
        </View>

        {fragmentCount > 1 && (
          <Text variant="bodyMedium" style={styles.animationHint}>
            Animated QR in progress
          </Text>
        )}
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
  animationHint: {
    marginTop: 12,
    color: theme.colors.onSurfaceVariant,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
