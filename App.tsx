/**
 * GapSign - Air-Gap Android wallet that works with Keycards
 *
 * @format
 */

import 'react-native-get-random-values';
import './shims';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  StatusBar,
  StyleSheet,
  ScrollView,
  View,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  PaperProvider,
  MD3DarkTheme,
  Text,
  Button,
  Card,
  ActivityIndicator,
  Icon,
  ProgressBar,
  Divider,
} from 'react-native-paper';
import {Camera} from 'react-native-camera-kit';
import type {OnReadCodeData} from 'react-native-camera-kit/src/CameraProps';
import {Buffer} from 'buffer';
import {URDecoder} from '@ngraveio/bc-ur';
import CBOR from 'cbor-sync';

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bb86fc',
    secondary: '#03dac6',
    surface: '#1e1e1e',
    surfaceVariant: '#2d2d2d',
    background: '#121212',
    onSurface: '#ffffff',
    onSurfaceVariant: 'rgba(255,255,255,0.7)',
  },
};

// ERC-4527 eth-sign-request data types
const DATA_TYPE_LABELS: Record<number, string> = {
  1: 'Legacy Transaction',
  2: 'EIP-712 Typed Data',
  3: 'Personal Message',
  4: 'EIP-1559 Transaction',
};

// ERC-4527 eth-sign-request CBOR map keys
// 1: requestId, 2: signData, 3: dataType, 4: chainId,
// 5: derivationPath (tagged 304), 6: address, 7: origin
type EthSignRequest = {
  requestId?: string;
  signData: string;
  dataType: number;
  chainId?: number;
  derivationPath: string;
  address?: string;
  origin?: string;
};

function parseDerivationPath(tagged: any): string {
  // The derivation path is CBOR tagged (304) containing a map
  // with keys: 1 = components array, 2 = source fingerprint, 3 = depth
  const pathMap = tagged?.value ?? tagged;
  if (!pathMap || typeof pathMap !== 'object') {
    return 'unknown';
  }

  const components = pathMap[1] || pathMap.get?.(1);
  if (!Array.isArray(components)) {
    return 'unknown';
  }

  // Components alternate: [index, hardened, index, hardened, ...]
  const parts: string[] = [];
  for (let i = 0; i < components.length; i += 2) {
    const index = components[i];
    const hardened = components[i + 1];
    parts.push(`${index}${hardened ? "'" : ''}`);
  }

  return 'm/' + parts.join('/');
}

function parseEthSignRequest(cborBytes: Buffer): EthSignRequest {
  const decoded = CBOR.decode(cborBytes);

  // cbor-sync decodes CBOR maps with integer keys as objects with string keys
  const signData = decoded[2] || decoded['2'];
  const dataType = decoded[3] || decoded['3'];
  const requestId = decoded[1] || decoded['1'];
  const chainId = decoded[4] || decoded['4'];
  const derivationPathRaw = decoded[5] || decoded['5'];
  const address = decoded[6] || decoded['6'];
  const origin = decoded[7] || decoded['7'];

  return {
    signData: Buffer.isBuffer(signData)
      ? signData.toString('hex')
      : String(signData),
    dataType: typeof dataType === 'number' ? dataType : 1,
    requestId: requestId
      ? Buffer.isBuffer(requestId)
        ? requestId.toString('hex')
        : String(requestId)
      : undefined,
    chainId: typeof chainId === 'number' ? chainId : undefined,
    derivationPath: parseDerivationPath(derivationPathRaw),
    address: address
      ? Buffer.isBuffer(address)
        ? '0x' + address.toString('hex')
        : String(address)
      : undefined,
    origin: typeof origin === 'string' ? origin : undefined,
  };
}

type ScanResult =
  | {kind: 'eth-sign-request'; request: EthSignRequest}
  | {kind: 'unsupported'; type: string}
  | {kind: 'error'; message: string};

function handleUR(type: string, cbor: Buffer): ScanResult {
  if (type === 'eth-sign-request') {
    try {
      return {kind: 'eth-sign-request', request: parseEthSignRequest(cbor)};
    } catch (e: any) {
      return {kind: 'error', message: `Failed to parse sign request: ${e.message}`};
    }
  }
  return {kind: 'unsupported', type};
}

function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <QRScannerScreen />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

function QRScannerScreen() {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [frameInfo, setFrameInfo] = useState('');
  const decoderRef = useRef<URDecoder | null>(null);

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

  const onCodeScanned = useCallback(
    (event: OnReadCodeData) => {
      if (result) {
        return;
      }

      const value = event.nativeEvent.codeStringValue;
      if (!value) {
        return;
      }

      const upperValue = value.toUpperCase();

      if (!upperValue.startsWith('UR:')) {
        // Ignore non-UR QR codes
        return;
      }

      // Initialize multi-frame decoder (also handles single-frame URs)
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
        if (decoder.isSuccess()) {
          const ur = decoder.resultUR();
          setResult(handleUR(ur.type, ur.cbor));
        } else {
          setResult({kind: 'error', message: decoder.resultError()});
        }
        decoderRef.current = null;
      }
    },
    [result],
  );

  const resetScanner = useCallback(() => {
    setResult(null);
    setProgress(0);
    setFrameInfo('');
    decoderRef.current = null;
  }, []);

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
      {!result && (
        <Camera
          style={StyleSheet.absoluteFill}
          scanBarcode
          onReadCode={onCodeScanned}
          showFrame={false}
        />
      )}

      {/* Top bar */}
      <View style={[styles.topBar, {paddingTop: insets.top + 8}]}>
        <Text variant="headlineMedium" style={styles.topTitle}>
          GapSign
        </Text>
        <Text variant="bodyMedium" style={styles.topSubtitle}>
          Scan ERC-4527 QR code
        </Text>
      </View>

      {/* Viewfinder + progress */}
      {!result && (
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
      )}

      {/* Result */}
      {result && (
        <ScrollView
          style={styles.resultScroll}
          contentContainerStyle={[
            styles.resultContainer,
            {paddingBottom: insets.bottom + 16},
          ]}>
          <ResultCard result={result} onReset={resetScanner} />
        </ScrollView>
      )}
    </View>
  );
}

function ResultCard({
  result,
  onReset,
}: {
  result: ScanResult;
  onReset: () => void;
}) {
  return (
    <Card style={styles.resultCard} mode="contained">
      <Card.Content style={styles.resultContent}>
        {result.kind === 'eth-sign-request' && (
          <EthSignRequestResult request={result.request} />
        )}
        {result.kind === 'unsupported' && (
          <>
            <Icon
              source="alert-circle-outline"
              size={40}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="titleMedium" style={styles.unsupportedText}>
              Unsupported QR type
            </Text>
            <Text variant="bodyMedium" style={styles.unsupportedSubtext}>
              {result.type}
            </Text>
          </>
        )}
        {result.kind === 'error' && (
          <>
            <Icon source="alert-circle" size={40} color="#cf6679" />
            <Text variant="labelLarge" style={styles.resultError}>
              Scan Error
            </Text>
            <Text variant="bodyMedium" style={styles.resultDataText} selectable>
              {result.message}
            </Text>
          </>
        )}
      </Card.Content>
      <Card.Actions style={styles.resultActions}>
        <Button mode="contained" onPress={onReset} icon="qrcode-scan">
          Scan Again
        </Button>
      </Card.Actions>
    </Card>
  );
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <Text variant="labelMedium" style={styles.infoLabel}>
        {label}
      </Text>
      <Text
        variant="bodyMedium"
        style={styles.infoValue}
        selectable
        numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function EthSignRequestResult({request}: {request: EthSignRequest}) {
  return (
    <>
      <Icon source="ethereum" size={40} color={theme.colors.primary} />
      <Text variant="titleMedium" style={styles.resultType}>
        Sign Request
      </Text>
      <Divider style={styles.divider} />
      <InfoRow
        label="Type"
        value={DATA_TYPE_LABELS[request.dataType] || `Unknown (${request.dataType})`}
      />
      {request.chainId !== undefined && (
        <InfoRow label="Chain ID" value={String(request.chainId)} />
      )}
      <InfoRow label="Derivation Path" value={request.derivationPath} />
      {request.address && (
        <InfoRow label="Address" value={request.address} />
      )}
      {request.origin && <InfoRow label="Origin" value={request.origin} />}
      {request.requestId && (
        <InfoRow label="Request ID" value={request.requestId} />
      )}
      <InfoRow label="Sign Data" value={request.signData} />
    </>
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
  resultScroll: {
    flex: 1,
    marginTop: 100,
  },
  resultContainer: {
    padding: 16,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
  },
  resultContent: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 24,
  },
  resultType: {
    color: theme.colors.secondary,
  },
  resultError: {
    color: '#cf6679',
  },
  resultDataText: {
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  unsupportedText: {
    color: theme.colors.onSurfaceVariant,
  },
  unsupportedSubtext: {
    color: theme.colors.onSurfaceVariant,
    fontFamily: 'monospace',
  },
  resultActions: {
    justifyContent: 'center',
    paddingBottom: 16,
  },
  divider: {
    width: '100%',
    backgroundColor: theme.colors.surfaceVariant,
  },
  infoRow: {
    width: '100%',
    paddingVertical: 4,
  },
  infoLabel: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  infoValue: {
    color: theme.colors.onSurface,
    fontFamily: 'monospace',
    fontSize: 13,
  },
});

export default App;
