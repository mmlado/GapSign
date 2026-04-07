import React, { useCallback, useEffect, useLayoutEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  ChangeSecretScreenProps,
  SecretType,
} from '../../navigation/types';

import { useChangeSecret } from '../../hooks/keycard/useChangeSecret';
import { useConfirmedEntry } from '../../hooks/useConfirmedEntry';

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
  const { phase, result, cancel } = keycard;

  const entry = useConfirmedEntry(newSecret => keycard.start(newSecret), {
    length: config.length,
  });

  useEffect(() => {
    if (phase !== 'done') {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Dashboard', params: { toast: config.toast } }],
    });
  }, [phase, result, navigation, config.toast]);

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  const goBack = useCallback(() => {
    if (phase === 'nfc' || phase === 'pin_entry') {
      cancel();
      navigation.goBack();
      return true;
    }

    const handled = entry.goBack();
    if (!handled) {
      navigation.goBack();
    }
    return true;
  }, [phase, entry, cancel, navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => sub.remove();
    }, [goBack]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (phase === 'nfc' || phase === 'pin_entry') {
        cancel();
        return;
      }
      if (entry.step === 'confirm') {
        e.preventDefault();
        entry.goBack();
      }
    });
    return unsubscribe;
  }, [navigation, phase, entry, cancel]);

  const title =
    phase === 'pin_entry'
      ? 'Enter current PIN'
      : entry.step === 'entry'
      ? config.entryTitle
      : config.confirmTitle;

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

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

      <NFCBottomSheet nfc={keycard} onCancel={handleCancel} showOnDone />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
