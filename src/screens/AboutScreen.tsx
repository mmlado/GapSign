import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AboutScreenProps, DashboardAction } from '../navigation/types';
import theme from '../theme';

import ContributorsList from '../components/about/ContributorsList';
import KeycardPurchaseCard from '../components/KeycardPurchaseCard';
import LicenseList from '../components/about/LicenseList';

import type { LicenseEntry } from '../data/licenses';
import { version as APP_VERSION } from '../../package.json';

export const dashboardEntry: DashboardAction = {
  label: 'About',
  navigate: nav => nav.navigate('About'),
};

export default function AboutScreen({ navigation }: AboutScreenProps) {
  const insets = useSafeAreaInsets();
  const handleSelectLicense = useCallback(
    (entry: LicenseEntry) => {
      navigation.navigate('LicenseDetail', {
        packageName: entry.package,
        licenseType: entry.licenseType,
      });
    },
    [navigation],
  );

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* App identity */}
      <View style={styles.header}>
        <Text style={styles.appName}>GapSign</Text>
        <Text style={styles.version}>v{APP_VERSION}</Text>
      </View>

      <Text style={styles.description}>
        GapSign is an open-source air-gapped hardware wallet companion for
        Android and iOS. It communicates with a Keycard via NFC, scans and
        produces animated QR codes in UR format, and supports Ethereum and
        Bitcoin signing — keeping your private keys offline at all times.
      </Text>

      {/* Keycard section */}
      <KeycardPurchaseCard />

      {/* Contributors */}
      <Text style={styles.sectionTitle}>Contributors</Text>
      <ContributorsList />

      {/* Licenses */}
      <Text style={styles.sectionTitle}>Open-source licenses</Text>
      <LicenseList onSelectLicense={handleSelectLicense} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  appName: {
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 28,
    color: theme.colors.onSurface,
  },
  version: {
    fontSize: 14,
    color: theme.colors.onSurfaceMuted,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 18,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
});
