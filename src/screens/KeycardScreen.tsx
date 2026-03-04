import React, {useCallback, useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {keccak_256} from '@noble/hashes/sha3';
import type {KeycardScreenProps} from '../navigation/types';
import {useKeycardOperation} from '../hooks/useKeycardOperation';
import NFCBottomSheet from '../components/NFCBottomSheet';
import {buildEthSignatureUR} from '../utils/ethSignature';
import {buildCryptoHdKeyUR} from '../utils/cryptoHdKey';
import PinPad from '../components/PinPad';

function prepareHash(signData: string, dataType: number | undefined): Uint8Array {
  const raw = new Uint8Array(Buffer.from(signData, 'hex'));
  if (dataType === 1 || dataType === 4) {
    return keccak_256(raw);
  }
  return raw;
}

export default function KeycardScreen({route, navigation}: KeycardScreenProps) {
  const params = route.params;
  const insets = useSafeAreaInsets();
  const hashRef = useRef<Uint8Array | null>(null);

  const {phase, status, result, execute, submitPin, cancel} =
    useKeycardOperation<Uint8Array>();

  const handleSign = useCallback(() => {
    if (params.operation !== 'sign') { return; }
    const hash = prepareHash(params.signData, params.dataType);
    hashRef.current = hash;
    execute(async cmdSet => {
      console.log(
        `[Keycard] signWithPath — path: ${params.derivationPath}, dataType: ${params.dataType}`,
      );
      const signResp = await cmdSet.signWithPath(
        hash,
        params.derivationPath,
        false,
      );
      signResp.checkOK();
      return signResp.data;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportKey = useCallback(() => {
    execute(async cmdSet => {
      const resp = await cmdSet.exportExtendedKey(0, params.derivationPath, false);
      resp.checkOK();
      return resp.data;
    }, {requiresPin: true});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (params.operation === 'sign') handleSign();
    else if (params.operation === 'export_key') handleExportKey();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'done' || !result) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        if (params.operation === 'sign') {
          if (!hashRef.current) return;
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
              {name: 'QRScanner'},
              {
                name: 'QRResult',
                params: {urString, label: 'Scan with MetaMask'},
              },
            ],
          });
          return;
        }
        if (params.operation === 'export_key') {
          const urString = buildCryptoHdKeyUR(result, params.derivationPath);
          navigation.navigate('QRResult', {urString, label: 'Scan QR with your software wallet'});
        }
      } catch (e: any) {
        console.error('[KeycardScreen] Failed to build UR:', e.message);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [phase, result, params, navigation]);

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom + 16}]}>
      {phase === 'pin_entry' && (
        <PinPad
          title="Enter Keycard PIN"
          onComplete={submitPin}
        />
      )}

      <NFCBottomSheet
        visible={phase === 'nfc' || phase === 'error' || phase === 'done'}
        status={status}
        variant={phase === 'done' ? 'success' : phase === 'error' ? 'error' : 'scanning'}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
