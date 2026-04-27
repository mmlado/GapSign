import React, { useCallback } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icons } from '../assets/icons';
import type { AboutScreenProps, DashboardAction } from '../navigation/types';
import theme from '../theme';

import ContributorsList from '../components/about/ContributorsList';
import DonationList from '../components/about/DonationList';
import KeycardPurchaseCard from '../components/KeycardPurchaseCard';
import LicenseList from '../components/about/LicenseList';

import type { LicenseEntry } from '../data/licenses';
import { version as APP_VERSION } from '../../package.json';

const PROJECT_GITHUB_URL = 'https://github.com/mmlado/GapSign';

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
        <View style={styles.appIdentity}>
          <Image
            source={require('../../fastlane/metadata/android/en-US/images/icon.png')}
            style={styles.appIcon}
            accessibilityLabel="GapSign app icon"
          />
          <Text style={styles.appName}>GapSign</Text>
        </View>
        <Text style={styles.version}>v{APP_VERSION}</Text>
      </View>

      <Text style={styles.description}>
        GapSign is an open-source air-gapped hardware wallet companion for
        Android and iOS. It communicates with a Keycard via NFC, scans and
        produces animated QR codes in UR format, and supports Ethereum and
        Bitcoin signing — keeping your private keys offline at all times.
      </Text>

      <Pressable
        style={styles.projectLink}
        onPress={() => Linking.openURL(PROJECT_GITHUB_URL)}
      >
        <Text style={styles.projectLinkText}>GitHub project</Text>
        <Icons.openInBrowser
          width={18}
          height={18}
          color={theme.colors.onSurface}
        />
      </Pressable>

      {/* Keycard section */}
      <KeycardPurchaseCard />

      {/* Donations */}
      <Text style={styles.sectionTitle}>Support development</Text>
      <Text style={styles.sectionDescription}>
        Donations help keep GapSign maintained and available as open-source
        software.
      </Text>
      <DonationList
        onShowQR={(label, address) =>
          navigation.navigate('AddressDetail', {
            address,
            index: 0,
            title: `${label} donation`,
          })
        }
      />

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
  appIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  appName: {
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 28,
    lineHeight: 34,
    color: theme.colors.onSurface,
  },
  appIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
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
  projectLink: {
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  projectLinkText: {
    color: theme.colors.onSurface,
    fontFamily: 'Inter_18pt-Medium',
    fontSize: 15,
  },
  sectionTitle: {
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 18,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  sectionDescription: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
