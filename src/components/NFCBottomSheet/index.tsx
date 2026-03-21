import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PinPad from '../PinPad';
import GenuineWarning from './GenuineWarning';
import NFCSheet from './NFCSheet';

export type NFCVariant = 'scanning' | 'success' | 'error' | 'genuine_warning';

export type NFCOperation = {
  phase: string;
  status: string;
  pinError?: string | null;
  submitPin?: (pin: string) => void;
  proceedWithNonGenuine?: () => void;
};

type Props = {
  nfc: NFCOperation;
  onCancel: () => void;
  /** Show success variant when phase is 'done' (e.g. for screens that navigate away after a delay) */
  showOnDone?: boolean;
};

export default function NFCBottomSheet({ nfc, onCancel, showOnDone }: Props) {
  const { phase, status, pinError, submitPin, proceedWithNonGenuine } = nfc;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;

  const showPinPad = phase === 'pin_entry';
  const showGenuineWarning = phase === 'genuine_warning';
  const showSheet =
    phase === 'nfc' ||
    phase === 'error' ||
    (showOnDone === true && phase === 'done');
  const modalVisible = showPinPad || showGenuineWarning || showSheet;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showSheet ? 0 : 400,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [showSheet, slideAnim]);

  const variant: NFCVariant =
    phase === 'genuine_warning'
      ? 'genuine_warning'
      : phase === 'done'
      ? 'success'
      : phase === 'error'
      ? 'error'
      : 'scanning';

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {showPinPad ? (
        <PinPad onComplete={submitPin!} error={pinError ?? undefined} />
      ) : showGenuineWarning ? (
        <GenuineWarning onCancel={onCancel} onProceed={proceedWithNonGenuine} />
      ) : (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16) + 8,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.handle} />
            <NFCSheet variant={variant} status={status} onCancel={onCancel} />
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 24,
  },
});
