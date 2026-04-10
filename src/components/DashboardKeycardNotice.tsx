import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native-paper';

import { Icons } from '../assets/icons';
import {
  KEYCARD_PURCHASE_COUPON_CODE,
  KEYCARD_PURCHASE_COUPON_MINIMUM,
  KEYCARD_PURCHASE_URL,
} from '../constants/keycard';
import {
  loadBooleanPreference,
  preferenceKeys,
  saveBooleanPreference,
} from '../storage/preferencesStorage';
import theme from '../theme';
import PrimaryButton from './PrimaryButton';

export default function DashboardKeycardNotice() {
  const [visible, setVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadBooleanPreference(preferenceKeys.dashboardKeycardNoticeDismissed).then(
      dismissed => {
        if (isMounted) {
          setVisible(!dismissed);
          setIsReady(true);
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePressPurchase = useCallback(() => {
    Linking.openURL(KEYCARD_PURCHASE_URL);
  }, []);

  const handleClose = useCallback(async () => {
    setVisible(false);
    await saveBooleanPreference(
      preferenceKeys.dashboardKeycardNoticeDismissed,
      true,
    );
  }, []);

  if (!isReady || !visible) {
    return null;
  }

  return (
    <View style={styles.noticeWrapper}>
      <View style={styles.noticeCard}>
        <Pressable
          style={styles.noticeCloseButton}
          onPress={handleClose}
          testID="dashboard-keycard-notice-close"
        >
          <Icons.close
            width={20}
            height={20}
            color={theme.colors.onSurfaceMuted}
          />
        </Pressable>

        <Text style={styles.noticeTitle}>Keycard required</Text>
        <Text style={styles.noticeDescription}>
          GapSign requires a Keycard hardware wallet to initialize, export keys,
          view addresses, and sign with NFC.
        </Text>

        {KEYCARD_PURCHASE_COUPON_CODE ? (
          <Text style={styles.noticeCoupon}>
            Use code {KEYCARD_PURCHASE_COUPON_CODE} on purchases over{' '}
            {KEYCARD_PURCHASE_COUPON_MINIMUM}.
          </Text>
        ) : null}

        <View style={styles.noticeButton}>
          <PrimaryButton
            label="Buy a Keycard"
            onPress={handlePressPurchase}
            icon={Icons.openInBrowser}
            testID="dashboard-keycard-purchase-link"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  noticeWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  noticeCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  noticeCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  noticeTitle: {
    color: theme.colors.onSurface,
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    paddingRight: 28,
    textAlign: 'center',
  },
  noticeDescription: {
    color: theme.colors.onSurfaceMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  noticeCoupon: {
    color: theme.colors.primary,
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  noticeButton: {
    alignItems: 'center',
    marginTop: 8,
  },
});
