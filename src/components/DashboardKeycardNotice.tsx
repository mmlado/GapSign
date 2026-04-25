import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  loadBooleanPreference,
  preferenceKeys,
  saveBooleanPreference,
} from '../storage/preferencesStorage';

import KeycardPurchaseCard from './KeycardPurchaseCard';

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
      <KeycardPurchaseCard
        onClose={handleClose}
        buttonTestID="dashboard-keycard-purchase-link"
        closeButtonTestID="dashboard-keycard-notice-close"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  noticeWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
