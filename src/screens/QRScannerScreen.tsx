import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Text,
  Button,
  ActivityIndicator,
  Icon,
  ProgressBar,
} from 'react-native-paper';
import {Camera} from 'react-native-camera-kit';
import type {OnReadCodeData} from 'react-native-camera-kit/src/CameraProps';
import {URDecoder} from '@ngraveio/bc-ur';
import {useFocusEffect} from '@react-navigation/native';
import theme from '../theme';
import {handleUR} from '../utils/ur';
import type {QRScannerScreenProps} from '../navigation/types';

export default function QRScannerScreen({navigation}: QRScannerScreenProps) {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const [frameInfo, setFrameInfo] = useState('');
  const decoderRef = useRef<URDecoder | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        setHasPermission(true);
      }
    })();
  }, []);

  // Reset scanner state when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;
      setProgress(0);
      setFrameInfo('');
      decoderRef.current = null;
    }, []),
  );

  const onCodeScanned = useCallback(
    (event: OnReadCodeData) => {
      if (scannedRef.current) {
        return;
      }

      const value = event.nativeEvent.codeStringValue;
      if (!value) {
        return;
      }

      const upperValue = value.toUpperCase();

      if (!upperValue.startsWith('UR:')) {
        return;
      }

      if (!decoderRef.current) {
        decoderRef.current = new URDecoder();
      }

      const decoder = decoderRef.current;
      decoder.receivePart(value);

      const pct = decoder.estimatedPercentComplete();
      setProgress(pct);

      const received = decoder.receivedPartIndexes().length;
      const expected = decoder.expectedPartCount();
      if (expected > 0) {
        setFrameInfo(`${received} / ${expected} frames`);
      }

      if (decoder.isComplete()) {
        scannedRef.current = true;
        if (decoder.isSuccess()) {
          const ur = decoder.resultUR();
          const result = handleUR(ur.type, ur.cbor);
          navigation.navigate('TransactionDetail', {result});
        } else {
          navigation.navigate('TransactionDetail', {
            result: {kind: 'error', message: decoder.resultError()},
          });
        }
        decoderRef.current = null;
      }
    },
    [navigation],
  );

  if (hasPermission === null) {
    return (
      <View style={[styles.centered, {paddingTop: insets.top}]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.centeredText}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={[styles.centered, {paddingTop: insets.top}]}>
        <Icon
          source="camera-off"
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={styles.centeredText}>
          Camera Permission Required
        </Text>
        <Text variant="bodyMedium" style={styles.centeredSubtext}>
          GapSign needs camera access to scan QR codes.
        </Text>
        <Button
          mode="contained"
          onPress={() => Linking.openSettings()}
          style={styles.permissionButton}>
          Open Settings
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.fullscreen}>
      <Camera
        style={StyleSheet.absoluteFill}
        scanBarcode
        onReadCode={onCodeScanned}
        showFrame={false}
      />

      <View style={[styles.topBar, {paddingTop: insets.top + 8}]}>
        <Text variant="headlineMedium" style={styles.topTitle}>
          GapSign
        </Text>
        <Text variant="bodyMedium" style={styles.topSubtitle}>
          Scan ERC-4527 QR code
        </Text>
      </View>

      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {progress > 0 && (
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={progress}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text variant="labelMedium" style={styles.progressText}>
              {frameInfo} ({Math.round(progress * 100)}%)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
    gap: 16,
  },
  centeredText: {
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  centeredSubtext: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 8,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingBottom: 12,
  },
  topTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  topSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: 250,
    height: 250,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: theme.colors.primary,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: theme.colors.primary,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: theme.colors.primary,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: theme.colors.primary,
    borderBottomRightRadius: 8,
  },
  progressContainer: {
    marginTop: 24,
    width: 250,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressText: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
});
