import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Icon } from 'react-native-paper';
import theme from '../theme';
import type { EthSignRequest } from '../types';
import { DATA_TYPE_LABELS } from '../types';
import type { TransactionDetailScreenProps } from '../navigation/types';
import PrimaryButton from '../components/PrimaryButton';
import { Icons } from '../assets/icons';
import { parseTx } from '../utils/txParser';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySmall" style={styles.infoLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.infoValue} selectable>
        {value}
      </Text>
    </View>
  );
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  10: 'Optimism',
  56: 'BNB Smart Chain',
  100: 'Gnosis',
  137: 'Polygon',
  250: 'Fantom',
  324: 'zkSync Era',
  8453: 'Base',
  42161: 'Arbitrum One',
  43114: 'Avalanche C-Chain',
  59144: 'Linea',
  534352: 'Scroll',
  11155111: 'Sepolia',
  80002: 'Polygon Amoy',
  84532: 'Base Sepolia',
  421614: 'Arbitrum Sepolia',
};

function chainLabel(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
}

function EthSignRequestDetail({ request }: { request: EthSignRequest }) {
  const typeLabel =
    DATA_TYPE_LABELS[request.dataType] || `Unknown (${request.dataType})`;
  const tx = parseTx(request.signData, request.dataType);

  return (
    <>
      <View style={styles.typeChip}>
        <Icon source="ethereum" size={18} color={theme.colors.primary} />
        <Text variant="labelLarge" style={styles.typeChipText}>
          {typeLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <InfoRow
          label="Signer"
          value={request.address ?? request.derivationPath}
        />
      </View>

      {request.address && (
        <View style={styles.row}>
          <InfoRow label="Path" value={request.derivationPath} />
        </View>
      )}

      {request.requestId && (
        <View style={styles.row}>
          <InfoRow label="Request ID" value={request.requestId} />
        </View>
      )}

      {tx?.to && (
        <View style={styles.row}>
          <InfoRow label="To" value={tx.to} />
        </View>
      )}

      {request.chainId !== undefined && (
        <View style={styles.row}>
          <InfoRow label="Chain" value={chainLabel(request.chainId)} />
        </View>
      )}

      {tx?.value !== undefined && (
        <View style={styles.row}>
          <InfoRow label="Amount" value={tx.value} />
        </View>
      )}

      {tx?.fees.kind === 'legacy' && (
        <View style={styles.row}>
          <InfoRow label="Gas price" value={tx.fees.gasPrice} />
          <InfoRow label="Gas limit" value={tx.fees.gasLimit} />
        </View>
      )}

      {tx?.fees.kind === 'eip1559' && (
        <View style={styles.row}>
          <InfoRow label="Max fee" value={tx.fees.maxFeePerGas} />
          <InfoRow label="Priority fee" value={tx.fees.maxPriorityFeePerGas} />
          <InfoRow label="Gas limit" value={tx.fees.gasLimit} />
        </View>
      )}

      <View style={styles.row}>
        <InfoRow label="Data" value={tx?.data ?? request.signData} />
      </View>

      {request.origin && (
        <View style={styles.row}>
          <InfoRow label="Origin" value={request.origin} />
        </View>
      )}
    </>
  );
}

export default function TransactionDetailScreen({
  route,
  navigation,
}: TransactionDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { result } = route.params;

  const handleSign = useCallback(() => {
    if (result.kind !== 'eth-sign-request') {
      return;
    }
    const request = result.request;
    navigation.navigate('Keycard', {
      operation: 'sign',
      signData: request.signData,
      derivationPath: request.derivationPath,
      chainId: request.chainId,
      requestId: request.requestId,
      dataType: request.dataType,
    });
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

      {result.kind === 'eth-sign-request' && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <PrimaryButton
            label="Sign transaction"
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
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  typeChipText: {
    color: theme.colors.primary,
  },
  row: {
    paddingVertical: 8,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: theme.colors.onSurfaceVariant,
  },
  infoValue: {
    color: theme.colors.onSurface,
    fontFamily: 'monospace',
    fontSize: 14,
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
