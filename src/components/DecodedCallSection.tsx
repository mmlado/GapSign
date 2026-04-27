import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import theme from '../theme';
import InfoRow from './InfoRow';
import { DecodedCall } from '../utils/txParser';

const UINT256_MAX = 2n ** 256n - 1n;

export default function DecodedCallSection({
  call,
  tokenContract,
}: {
  call: DecodedCall;
  tokenContract?: string;
}) {
  if (call.kind === 'erc20-transfer') {
    return (
      <>
        <View style={styles.sectionHeader}>
          <Text variant="labelMedium" style={styles.sectionHeaderText}>
            ERC-20 Transfer
          </Text>
        </View>
        {tokenContract && (
          <View style={styles.row}>
            <InfoRow label="Token contract" value={tokenContract} />
          </View>
        )}
        <View style={styles.row}>
          <InfoRow label="Recipient" value={call.to} />
        </View>
        <View style={styles.row}>
          <InfoRow label="Amount (raw units)" value={call.amount.toString()} />
        </View>
      </>
    );
  }
  if (call.kind === 'erc20-transferFrom') {
    return (
      <>
        <View style={styles.sectionHeader}>
          <Text variant="labelMedium" style={styles.sectionHeaderText}>
            ERC-20 Transfer From
          </Text>
        </View>
        {tokenContract && (
          <View style={styles.row}>
            <InfoRow label="Token contract" value={tokenContract} />
          </View>
        )}
        <View style={styles.row}>
          <InfoRow label="From" value={call.from} />
        </View>
        <View style={styles.row}>
          <InfoRow label="Recipient" value={call.to} />
        </View>
        <View style={styles.row}>
          <InfoRow label="Amount (raw units)" value={call.amount.toString()} />
        </View>
      </>
    );
  }
  if (call.kind === 'erc20-approve') {
    const isUnlimited = call.amount === UINT256_MAX;
    return (
      <>
        <View style={styles.sectionHeader}>
          <Text variant="labelMedium" style={styles.sectionHeaderText}>
            ERC-20 Approve
          </Text>
        </View>
        {tokenContract && (
          <View style={styles.row}>
            <InfoRow label="Token contract" value={tokenContract} />
          </View>
        )}
        <View style={styles.row}>
          <InfoRow label="Spender" value={call.spender} />
        </View>
        <View style={styles.row}>
          <InfoRow
            label="Allowance"
            value={isUnlimited ? 'Unlimited' : call.amount.toString()}
          />
        </View>
        {isUnlimited && (
          <View style={styles.warningRow}>
            <Icon source="alert" size={16} color={theme.colors.negative} />
            <Text variant="labelSmall" style={styles.warningText}>
              Unlimited approval — spender can transfer all tokens of this type
            </Text>
          </View>
        )}
      </>
    );
  }
  return (
    <View style={styles.row}>
      <InfoRow label="Contract call" value={call.selector} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 8,
  },
  sectionHeader: {
    paddingTop: 8,
  },
  sectionHeaderText: {
    color: theme.colors.onSurfaceVariant,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  warningText: {
    color: theme.colors.negative,
    flexShrink: 1,
  },
});
