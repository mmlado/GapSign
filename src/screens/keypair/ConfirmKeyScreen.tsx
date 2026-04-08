import { useCallback, useEffect, useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmKeySreenProps } from '../../navigation/types';
import theme from '../../theme';

import MnemonicBackupCheck from '../../components/MnemonicBackupCheck';
import NFCBottomSheet from '../../components/NFCBottomSheet';

import { useLoadKey } from '../../hooks/keycard/useLoadKey';

export default function ConfirmKeyScreen({
  navigation,
  route,
}: ConfirmKeySreenProps) {
  const insets = useSafeAreaInsets();
  const { words, passphrase } = route.params;

  const keycard = useLoadKey(words, passphrase);
  const { phase, start, cancel } = keycard;

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  useEffect(() => {
    if (phase === 'done') {
      navigation.navigate('Dashboard', {
        toast: 'Key pair has been added to Keycard',
      });
    }
  }, [phase, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: phase === 'pin_entry' ? 'Enter Keycard PIN' : 'Check your backup',
    });
  }, [navigation, phase]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <MnemonicBackupCheck
        words={words}
        description="Confirm word positions in your recovery phrase."
        onComplete={start}
      />

      <NFCBottomSheet nfc={keycard} onCancel={handleCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
