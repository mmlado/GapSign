import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icons } from '../../assets/icons';
import PrimaryButton from '../PrimaryButton';
import theme from '../../theme';

type Props = {
  onCancel: () => void;
  onProceed?: () => void;
};

export default function GenuineWarning({ onCancel, onProceed }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 16) + 8 },
      ]}
    >
      <View style={styles.content}>
        <Icons.exclamation width={64} height={64} color="#E95460" />
        <Text variant="headlineSmall" style={styles.title}>
          Unverified Keycard
        </Text>
        <Text variant="bodyMedium" style={styles.body}>
          This card could not be verified as an authentic Keycard. It may be
          counterfeit. Proceeding is not recommended unless you trust the
          source.
        </Text>
      </View>

      <View style={styles.buttons}>
        <PrimaryButton
          testID="cancel-button"
          label="Cancel"
          onPress={onCancel}
        />
        <Pressable
          testID="proceed-button"
          style={styles.proceedButton}
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
          onPress={onProceed}
        >
          <Text variant="labelLarge" style={styles.proceedText}>
            Proceed Anyway
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    gap: 8,
  },
  proceedButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  proceedText: {
    color: 'rgba(255,255,255,0.4)',
  },
});
