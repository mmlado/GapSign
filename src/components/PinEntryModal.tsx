import React, {useCallback, useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {Icon, Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
};

const PIN_LENGTH = 6;

const PAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function PinEntryModal({visible, onSubmit, onCancel}: Props) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');

  // Reset PIN each time the modal becomes visible.
  useEffect(() => {
    if (visible) {
      setPin('');
    }
  }, [visible]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === '⌫') {
        setPin(p => p.slice(0, -1));
      } else if (key === '') {
        // empty cell — no-op
      } else if (pin.length < PIN_LENGTH) {
        const next = pin + key;
        setPin(next);
        if (next.length === PIN_LENGTH) {
          onSubmit(next);
        }
      }
    },
    [pin, onSubmit],
  );

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={[styles.overlay, {paddingBottom: insets.bottom + 24}]}>
        <View style={styles.sheet}>
          <Text variant="titleLarge" style={styles.title}>
            Enter PIN
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your 6-digit Keycard PIN
          </Text>

          <View style={styles.dots}>
            {Array.from({length: PIN_LENGTH}).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < pin.length && styles.dotFilled]}
              />
            ))}
          </View>

          <View style={styles.pad}>
            {PAD_KEYS.map((row, ri) => (
              <View key={ri} style={styles.padRow}>
                {row.map((key, ki) => (
                  <Pressable
                    key={ki}
                    style={({pressed}) => [
                      styles.padKey,
                      key === '' && styles.padKeyEmpty,
                      pressed && key !== '' && styles.padKeyPressed,
                    ]}
                    onPress={() => handleKey(key)}
                    disabled={key === ''}>
                    {key === '⌫' ? (
                      <Icon source="backspace-outline" size={24} color="#ffffff" />
                    ) : (
                      <Text variant="headlineSmall" style={styles.padKeyText}>
                        {key}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 32,
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#bb86fc',
    borderColor: '#bb86fc',
  },
  pad: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  padKey: {
    width: 80,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  padKeyEmpty: {
    backgroundColor: 'transparent',
  },
  padKeyPressed: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  padKeyText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 8,
  },
  cancelText: {
    color: '#bb86fc',
  },
});
