import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {keccak_256} from '@noble/hashes/sha3';
import type {KeycardScreenProps} from '../navigation/types';
import {useKeycardOperation} from '../hooks/useKeycardOperation';
import NFCBottomSheet from '../components/NFCBottomSheet';
import {buildEthSignatureUR} from '../utils/ethSignature';
import {buildCryptoHdKeyUR} from '../utils/cryptoHdKey';
import { Icons } from '../assets/icons';

const PIN_LENGTH = 6;

const PAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

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
  const [pin, setPin] = useState('');
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

    try {
      if (params.operation === 'sign') {
        if (!hashRef.current) return
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
        navigation.navigate('QRResult', {urString, label: 'Scan QR with youw software wallet'});
      }
    } catch (e: any) {
      console.error('[KeycardScreen] Failed to build UR:', e.message);
    }
  }, [phase, result, params, navigation]);

  useEffect(() => {
    if (phase === 'pin_entry') {
      setPin('');
    }
  }, [phase]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === '') {
        return
      }
      if (key === '⌫') {
        setPin(p => p.slice(0, -1));
      } else if (pin.length < PIN_LENGTH) {
        const next = pin + key;
        setPin(next);
        if (next.length === PIN_LENGTH) {
          submitPin(next);
          setPin('');
        }
      }
    },
    [pin, submitPin],
  );

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom + 16}]}>
      {phase === 'pin_entry' && (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>
              Enter Keycard PIN
            </Text>
            <View style={styles.dotsWrapper}>
              <View style={styles.dots}>
                {Array.from({length: PIN_LENGTH}).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i < pin.length && styles.dotFilled]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.pad}>
            {PAD_KEYS.map((row, ri) => (
              <View key={ri} style={styles.padRow}>
                {row.map((key, ki) => (
                  <Pressable
                    key={ki}
                    style={({pressed}) => [
                      styles.padKey,
                      key === '' && styles.padKeyEmpty,
                      pressed && key !== '' && styles.padKeyPressed,
                    ]}
                    onPress={() => handleKey(key)}
                    disabled={key === ''}>
                    {key === '⌫' ? (
                      <Icons.backspace width={24} height={24} />
                    ) : (
                      <Text variant="headlineMedium" style={styles.padKeyText}>
                        {key}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </>
      )}

      <NFCBottomSheet
        visible={phase === 'nfc' || phase === 'error'}
        status={status}
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
  header: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  title: {
    color: '#ffffff',
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.567, // -2.1% of 27px
    marginBottom: 8,
  },
  dotsWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotFilled: {
    backgroundColor: '#ffffff',
  },
  pad: {
    width: '100%',
    gap: 4,
  },
  backspaceIcon: {
    width: 32,
    height: 32,
    tintColor: '#ffffff',
  },
  padRow: {
    flexDirection: 'row',
  },
  padKey: {
    flex: 1,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padKeyEmpty: {},
  padKeyPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 48,
  },
  padKeyText: {
    color: '#ffffff',
    fontWeight: '300',
  },
});
