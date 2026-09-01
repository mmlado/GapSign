import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context';

import theme from '@/theme';

import { Icons } from '@/assets/icons';

import PinPad from '@/components/PinPad';

import type {
  CardPresence,
  KeycardPhase,
} from '@/hooks/keycard/useKeycardOperation';

import GenuineWarning from './GenuineWarning';
import NFCError from './NFCError';
import NFCSheet from './NFCSheet';
import PairingPasswordEntry from './PairingPasswordEntry';

/** Keeps the PIN modal inside the same bounds as a normal navigation screen. */
const PIN_MODAL_EDGES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

export type NFCVariant =
  | 'scanning'
  | 'connected'
  | 'disconnected'
  | 'success'
  | 'error'
  | 'genuine_warning';

export type NFCOperation = {
  phase: KeycardPhase;
  status: string;
  cardPresence?: CardPresence;
  cardName?: string | null;
  cardFingerprint?: number | null;
  pinError?: string | null;
  submitPin?: (pin: string) => void;
  pairingPasswordError?: string | null;
  submitPairingPassword?: (password: string) => void;
  proceedWithNonGenuine?: () => void;
  retry?: () => void;
  openNFCSettings?: () => void;
};

type Props = {
  nfc: NFCOperation;
  onCancel: () => void;
  /** Show success variant when phase is 'done' (e.g. for screens that navigate away after a delay) */
  showOnDone?: boolean;
};

export default function NFCBottomSheet({ nfc, onCancel, showOnDone }: Props) {
  const {
    phase,
    status,
    cardPresence,
    cardName,
    cardFingerprint,
    pinError,
    submitPin,
    pairingPasswordError,
    submitPairingPassword,
    proceedWithNonGenuine,
    retry,
    openNFCSettings,
  } = nfc;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const [modalVisible, setModalVisible] = useState(false);

  const showPinPad = phase === 'pin_entry';
  const showGenuineWarning = phase === 'genuine_warning';
  const showPairingPassword = phase === 'pairing_password';
  const showIOSError = Platform.OS === 'ios' && phase === 'error';
  // The connected/disconnected presence variants are Android-only by design:
  // iOS shows Apple's system NFC sheet, which owns that feedback (mirrors
  // status-legacy's platform/android? gate around its connection sheet).
  const showSheet =
    Platform.OS === 'android' &&
    (phase === 'nfc' ||
      phase === 'error' ||
      (showOnDone === true && phase === 'done'));

  useEffect(() => {
    if (!showPinPad) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [showPinPad, onCancel]);

  useEffect(() => {
    if (showIOSError) {
      setModalVisible(false);
      return;
    }
    if (showSheet || showGenuineWarning || showPairingPassword) {
      setModalVisible(true);
    }
    Animated.spring(slideAnim, {
      toValue: showSheet ? 0 : 400,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start(({ finished }) => {
      if (
        finished &&
        !showSheet &&
        !showGenuineWarning &&
        !showPairingPassword
      ) {
        setModalVisible(false);
      }
    });
  }, [
    showSheet,
    showGenuineWarning,
    showPairingPassword,
    showIOSError,
    slideAnim,
  ]);

  // Phase always wins over presence: an error must render as an error even if
  // the card is technically still on the antenna.
  const variant: NFCVariant =
    phase === 'genuine_warning'
      ? 'genuine_warning'
      : phase === 'done'
      ? 'success'
      : phase === 'error'
      ? 'error'
      : cardPresence === 'lost'
      ? 'disconnected'
      : cardPresence === 'connected'
      ? 'connected'
      : 'scanning';

  return (
    <>
      <Modal
        visible={showPinPad}
        transparent={false}
        statusBarTranslucent
        animationType="slide"
        onRequestClose={onCancel}
      >
        <SafeAreaView style={styles.pinModal} edges={PIN_MODAL_EDGES}>
          <View style={styles.header}>
            <Pressable
              onPress={onCancel}
              hitSlop={12}
              style={styles.headerBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icons.arrowLeft />
            </Pressable>
            <Text style={styles.headerTitle}>Enter PIN</Text>
          </View>
          <PinPad onComplete={submitPin!} error={pinError ?? undefined} />
        </SafeAreaView>
      </Modal>

      {showIOSError && (
        <NFCError
          status={status}
          retry={retry}
          openNFCSettings={openNFCSettings}
          onCancel={onCancel}
          paddingBottom={insets.bottom + 24}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={onCancel}
      >
        {showGenuineWarning ? (
          <GenuineWarning
            onCancel={onCancel}
            onProceed={proceedWithNonGenuine}
          />
        ) : showPairingPassword && submitPairingPassword ? (
          <PairingPasswordEntry
            error={pairingPasswordError ?? null}
            onSubmit={submitPairingPassword}
            onCancel={onCancel}
          />
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
              <NFCSheet
                variant={variant}
                status={status}
                cardName={cardName}
                cardFingerprint={cardFingerprint}
                onCancel={onCancel}
                retry={retry}
                openNFCSettings={openNFCSettings}
              />
            </Animated.View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
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
  pinModal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  headerBack: {
    position: 'absolute',
    left: 8,
    bottom: 0,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: theme.colors.onSurface,
    fontSize: 17,
    fontWeight: '600',
  },
});
