import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { KeycardScreenProps } from '../navigation/types';
import NFCBottomSheet from '../components/NFCBottomSheet';
import { useKeycardOperation } from '../hooks/keycard/useKeycardOperation';
import { buildEthSignatureUR } from '../utils/ethSignature';
import {
  buildExportUr,
  exportKeyForWallet,
  prepareSignHash,
  type ExportKeyResult,
} from '../utils/keycardExport';

export default function KeycardScreen({
  route,
  navigation,
}: KeycardScreenProps) {
  const params = route.params;
  const insets = useSafeAreaInsets();
  const hashRef = useRef<Uint8Array | null>(null);

  const keycard = useKeycardOperation<ExportKeyResult>();
  const { phase, result, execute, cancel } = keycard;

  const handleSign = useCallback(() => {
    if (params.operation !== 'sign') {
      return;
    }

    const hash = prepareSignHash(params.signData, params.dataType);
    hashRef.current = hash;

    execute(async cmdSet => {
      const signResp = await cmdSet.signWithPath(
        hash,
        params.derivationPath,
        false,
      );
      signResp.checkOK();
      return signResp.data;
    });
  }, [execute, params]);

  const handleExportKey = useCallback(() => {
    if (params.operation !== 'export_key') {
      return;
    }

    execute(cmdSet => exportKeyForWallet(cmdSet, params.derivationPath), {
      requiresPin: true,
    });
  }, [execute, params]);

  useEffect(() => {
    if (params.operation === 'sign') {
      handleSign();
    } else if (params.operation === 'export_key') {
      handleExportKey();
    }
  }, [handleExportKey, handleSign, params.operation]);

  useEffect(() => {
    if (phase !== 'done' || !result) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        if (params.operation === 'sign') {
          if (!hashRef.current || !(result instanceof Uint8Array)) {
            return;
          }

          const urString = buildEthSignatureUR(
            Array.from(result)
              .map(b => b.toString(16).padStart(2, '0'))
              .join(''),
            hashRef.current,
            params.dataType,
            params.chainId,
            params.requestId,
          );
          navigation.reset({
            index: 1,
            routes: [
              { name: 'QRScanner' },
              { name: 'QRResult', params: { urString } },
            ],
          });
          return;
        }

        if (params.operation === 'export_key') {
          const urString = buildExportUr(result, params.derivationPath);
          navigation.reset({
            index: 2,
            routes: [
              { name: 'Dashboard' },
              { name: 'ExportKey' },
              { name: 'QRResult', params: { urString } },
            ],
          });
        }
      } catch (e: any) {
        console.error('[KeycardScreen] Failed to build UR:', e.message);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [navigation, params, phase, result]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Enter Keycard PIN' });
  }, [navigation]);

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <NFCBottomSheet nfc={keycard} onCancel={handleCancel} showOnDone />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
