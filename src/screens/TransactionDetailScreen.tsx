import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text } from 'react-native-paper';

import { Icons } from '../assets/icons';
import type { TransactionDetailScreenProps } from '../navigation/types';
import theme from '../theme';
import BtcPsbtDetail from '../components/BtcPsbtDetail';
import BtcSignRequestDetail from '../components/BtcSignRequestDetail';
import EthSignRequestDetail from '../components/EthSignRequestDetail';
import PrimaryButton from '../components/PrimaryButton';
import { inspectBtcPsbt } from '../utils/btcPsbt';

export default function TransactionDetailScreen({
  route,
  navigation,
}: TransactionDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { result } = route.params;
  const isBip322Message =
    result.kind === 'crypto-psbt' &&
    (() => {
      try {
        return (
          inspectBtcPsbt(result.request.psbtHex).requestType ===
          'bip322-message'
        );
      } catch {
        return false;
      }
    })();

  const handleSign = useCallback(() => {
    if (result.kind === 'eth-sign-request') {
      const request = result.request;
      navigation.navigate('Keycard', {
        operation: 'sign',
        signMode: 'eth',
        signData: request.signData,
        derivationPath: request.derivationPath,
        chainId: request.chainId,
        requestId: request.requestId,
        dataType: request.dataType,
      });
    } else if (result.kind === 'crypto-psbt') {
      navigation.navigate('Keycard', {
        operation: 'sign',
        signMode: 'btc',
        psbtHex: result.request.psbtHex,
      });
    } else if (result.kind === 'btc-sign-request') {
      const request = result.request;
      navigation.navigate('Keycard', {
        operation: 'sign',
        signMode: 'btc-message',
        requestId: request.requestId,
        signDataHex: request.signDataHex,
        derivationPath: request.derivationPath,
        address: request.address,
        origin: request.origin,
      });
    }
  }, [result, navigation]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {result.kind === 'eth-sign-request' && (
          <EthSignRequestDetail request={result.request} />
        )}

        {result.kind === 'crypto-psbt' && (
          <BtcPsbtDetail psbtHex={result.request.psbtHex} />
        )}

        {result.kind === 'btc-sign-request' && (
          <BtcSignRequestDetail request={result.request} />
        )}

        {result.kind === 'unsupported' && (
          <View style={styles.errorContainer}>
            <Icon
              source="alert-circle-outline"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="titleMedium" style={styles.errorTitle}>
              Unsupported QR Type
            </Text>
            <Text variant="bodyMedium" style={styles.errorMessage}>
              {result.type}
            </Text>
          </View>
        )}

        {result.kind === 'error' && (
          <View style={styles.errorContainer}>
            <Icon source="alert-circle" size={48} color="#cf6679" />
            <Text variant="titleMedium" style={styles.errorTitleRed}>
              Scan Error
            </Text>
            <Text variant="bodyMedium" style={styles.errorMessage} selectable>
              {result.message}
            </Text>
          </View>
        )}
      </ScrollView>

      {(result.kind === 'eth-sign-request' ||
        result.kind === 'crypto-psbt' ||
        result.kind === 'btc-sign-request') && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <PrimaryButton
            label={
              isBip322Message || result.kind === 'btc-sign-request'
                ? 'Sign message'
                : 'Sign transaction'
            }
            onPress={handleSign}
            icon={Icons.nfcActivate}
          />
        </View>
      )}
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
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 24,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  errorTitle: {
    color: theme.colors.onSurfaceVariant,
  },
  errorTitleRed: {
    color: '#cf6679',
  },
  errorMessage: {
    color: theme.colors.onSurface,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
