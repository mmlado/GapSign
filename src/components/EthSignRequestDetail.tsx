import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import type { EthSignRequest } from '../types';
import theme from '../theme';
import DecodedCallSection from './DecodedCallSection';
import InfoRow from './InfoRow';
import { getChainName, getNativeCurrencySymbol } from '../utils/chainMetadata';
import { parseEip712Prehashed, parseEip712Summary } from '../utils/eip712';
import { getTxLabel, parseTx } from '../utils/txParser';

export default function EthSignRequestDetail({
  request,
}: {
  request: EthSignRequest;
}) {
  const nativeSymbol =
    request.chainId !== undefined
      ? getNativeCurrencySymbol(request.chainId)
      : 'ETH';
  const typeLabel = getTxLabel(request.signData, request.dataType);
  const tx = parseTx(request.signData, request.dataType, nativeSymbol);
  const eip712 =
    request.dataType === 2 ? parseEip712Summary(request.signData) : null;
  const eip712Prehashed =
    request.dataType === 2 && !eip712
      ? parseEip712Prehashed(request.signData)
      : null;

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

      {tx?.to && !tx.decodedCall && (
        <View style={styles.row}>
          <InfoRow label="To" value={tx.to} />
        </View>
      )}

      {request.chainId !== undefined && (
        <View style={styles.row}>
          <InfoRow label="Chain" value={getChainName(request.chainId)} />
        </View>
      )}

      {tx?.value !== undefined && (tx.value !== '0' || !tx.decodedCall) && (
        <View style={styles.row}>
          <InfoRow label="Amount" value={tx.value} />
        </View>
      )}

      {tx?.decodedCall && (
        <DecodedCallSection
          call={tx.decodedCall}
          tokenContract={tx.to}
          chainId={request.chainId}
        />
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

      {eip712?.primaryType && (
        <View style={styles.row}>
          <InfoRow label="Primary type" value={eip712.primaryType} />
        </View>
      )}

      {Object.keys(eip712?.domain ?? {}).length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text variant="labelMedium" style={styles.sectionHeaderText}>
              EIP-712 Domain
            </Text>
          </View>
          {Object.entries(eip712!.domain).map(([key, value]) => (
            <View key={`domain-${key}`} style={styles.row}>
              <InfoRow label={key} value={value} />
            </View>
          ))}
        </>
      )}

      {Object.keys(eip712?.message ?? {}).length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text variant="labelMedium" style={styles.sectionHeaderText}>
              Message Fields
            </Text>
          </View>
          {Object.entries(eip712!.message).map(([key, value]) => (
            <View key={`message-${key}`} style={styles.row}>
              <InfoRow label={key} value={value} />
            </View>
          ))}
        </>
      )}

      {eip712Prehashed && (
        <>
          <View style={styles.sectionHeader}>
            <Text variant="labelMedium" style={styles.sectionHeaderText}>
              EIP-712 (pre-hashed)
            </Text>
          </View>
          <View style={styles.row}>
            <InfoRow
              label="Domain separator"
              value={eip712Prehashed.domainSeparatorHash}
            />
          </View>
          <View style={styles.row}>
            <InfoRow label="Message hash" value={eip712Prehashed.messageHash} />
          </View>
        </>
      )}

      {!eip712Prehashed &&
        (!tx?.decodedCall || tx.decodedCall.kind === 'unknown-call') && (
          <View style={styles.row}>
            <InfoRow
              label="Data"
              value={eip712?.rawJson ?? tx?.data ?? request.signData}
            />
          </View>
        )}

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
  sectionHeader: {
    paddingTop: 8,
  },
  sectionHeaderText: {
    color: theme.colors.onSurfaceVariant,
  },
});
