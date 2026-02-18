import React from 'react';
import {StyleSheet, ScrollView, View, Image, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text, Icon} from 'react-native-paper';
import theme from '../theme';
import type {EthSignRequest} from '../types';
import {DATA_TYPE_LABELS} from '../types';
import type {TransactionDetailScreenProps} from '../navigation/types';

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <Text variant="labelSmall" style={styles.infoLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.infoValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function EthSignRequestDetail({request}: {request: EthSignRequest}) {
  const typeLabel =
    DATA_TYPE_LABELS[request.dataType] || `Unknown (${request.dataType})`;

  return (
    <>
      <View style={styles.typeChip}>
        <Icon source="ethereum" size={18} color={theme.colors.primary} />
        <Text variant="labelLarge" style={styles.typeChipText}>
          {typeLabel}
        </Text>
      </View>

      {request.chainId !== undefined && (
        <View style={styles.card}>
          <InfoRow label="CHAIN ID" value={String(request.chainId)} />
        </View>
      )}

      {request.address && (
        <View style={styles.card}>
          <InfoRow label="ADDRESS" value={request.address} />
        </View>
      )}

      <View style={styles.card}>
        <InfoRow label="DERIVATION PATH" value={request.derivationPath} />
      </View>

      {request.origin && (
        <View style={styles.card}>
          <InfoRow label="ORIGIN" value={request.origin} />
        </View>
      )}

      {request.requestId && (
        <View style={styles.card}>
          <InfoRow label="REQUEST ID" value={request.requestId} />
        </View>
      )}

      <View style={styles.card}>
        <InfoRow label="SIGN DATA" value={request.signData} />
      </View>
    </>
  );
}

export default function TransactionDetailScreen({
  route,
}: TransactionDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const {result} = route.params;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: 24},
        ]}>
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
        <View style={[styles.actions, {paddingBottom: insets.bottom + 16}]}>
          <Pressable
            style={styles.signButton}
            android_ripple={{color: 'rgba(255,255,255,0.3)'}}>
            <View style={styles.signButtonContent}>
              <Text variant="labelLarge" style={styles.signButtonText}>
                Sign transaction
              </Text>
              <Image
                source={require('../assets/icons/keycard.png')}
                style={styles.signButtonIcon}
                resizeMode="contain"
              />
            </View>
          </Pressable>
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
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
  scanAgainButton: {
    borderColor: theme.colors.surfaceVariant,
  },
  signButton: {
    backgroundColor: '#FF6400',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    minHeight: 40,
  },
  signButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signButtonIcon: {
    width: 32,
    height: 32,
  },
  signButtonText: {
    color: '#ffffff',
    fontWeight: '600',
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
