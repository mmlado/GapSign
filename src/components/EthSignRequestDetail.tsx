import { View, StyleSheet } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import theme from '../theme';
import { DATA_TYPE_LABELS, type EthSignRequest } from '../types';
import { parseTx } from '../utils/txParser';
import InfoRow from './InfoRow';

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

export default function EthSignRequestDetail({
  request,
}: {
  request: EthSignRequest;
}) {
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

const styles = StyleSheet.create({
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
});
