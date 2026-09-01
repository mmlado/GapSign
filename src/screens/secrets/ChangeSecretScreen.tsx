import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  ChangeSecretScreenProps,
  SecretType,
} from '../../navigation/types';

import { useChangeSecret } from '../../hooks/keycard/useChangeSecret';
import { useConfirmedEntry } from '../../hooks/useConfirmedEntry';
import { useKeycardScreen } from '../../hooks/useKeycardScreen';

import theme from '../../theme';
import NFCBottomSheet from '../../components/NFCBottomSheet';
import PinPad from '../../components/PinPad';
import TextEntry from '../../components/TextEntry';

type SecretConfig = {
  inputType: 'numeric' | 'text';
  length?: number;
  entryTitle: string;
  confirmTitle: string;
  toast: string;
};

const SECRET_CONFIG: Record<SecretType, SecretConfig> = {
  pin: {
    inputType: 'numeric',
    length: 6,
    entryTitle: 'Enter new PIN',
    confirmTitle: 'Confirm new PIN',
    toast: 'PIN changed',
  },
  puk: {
    inputType: 'numeric',
    length: 12,
    entryTitle: 'Enter new PUK',
    confirmTitle: 'Confirm new PUK',
    toast: 'PUK changed',
  },
  pairing: {
    inputType: 'text',
    entryTitle: 'Enter new pairing secret',
    confirmTitle: 'Confirm pairing secret',
    toast: 'Pairing secret changed',
  },
};

export default function ChangeSecretScreen({
  route,
  navigation,
}: ChangeSecretScreenProps) {
  const { secretType } = route.params;
  const config = SECRET_CONFIG[secretType];
  const insets = useSafeAreaInsets();

  const keycard = useChangeSecret(secretType);
  const { phase } = keycard;

  const entry = useConfirmedEntry(newSecret => keycard.start(newSecret), {
    length: config.length,
  });

  const onScreenBack = useCallback(() => {
    const handled = entry.goBack();
    if (!handled) {
      navigation.goBack();
    }
    return true;
  }, [entry, navigation]);

  const { onCancel } = useKeycardScreen({
    keycard,
    navigation,
    title: entry.step === 'entry' ? config.entryTitle : config.confirmTitle,
    pinEntryTitle: 'Enter current PIN',
    done: { toast: config.toast },
    onHardwareBack: onScreenBack,
    onBeforeRemove: e => {
      if (entry.step === 'confirm') {
        e.preventDefault();
        entry.goBack();
      }
    },
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      {phase === 'idle' && config.inputType === 'numeric' && (
        <PinPad
          key={entry.step}
          length={entry.length}
          onComplete={
            entry.step === 'entry' ? entry.handleEntry : entry.handleConfirm
          }
          error={entry.error}
          onType={entry.clearError}
        />
      )}

      {phase === 'idle' && config.inputType === 'text' && (
        <TextEntry
          resetKey={entry.step}
          onSubmit={
            entry.step === 'entry' ? entry.handleEntry : entry.handleConfirm
          }
          error={entry.error}
          onType={entry.clearError}
        />
      )}

      <NFCBottomSheet nfc={keycard} onCancel={onCancel} showOnDone />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
