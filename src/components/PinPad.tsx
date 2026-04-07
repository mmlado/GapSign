import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import theme from '../theme';
import { Icons } from '../assets/icons';

function Caret() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.caret, { opacity }]} />;
}

interface PinPadProps {
  onComplete: (pin: string) => void;
  error?: string;
  onType?: () => void;
  length?: number;
}

const PIN_LENGTH = 6;

const PAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function PinPad({
  onComplete,
  error,
  onType,
  length = PIN_LENGTH,
}: PinPadProps) {
  const [pin, setPin] = useState('');

  const handleKey = useCallback(
    (key: string) => {
      if (key !== '') {
        onType?.();
      }
      if (key === '') {
        return;
      }
      if (key === '⌫') {
        setPin(p => p.slice(0, -1));
      } else if (pin.length < length) {
        const next = pin + key;
        setPin(next);
        if (next.length === length) {
          onComplete(next);
          setPin('');
        }
      }
    },
    [pin, onComplete, onType, length],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.fieldWrapper}>
          <View style={styles.pinField}>
            <Text style={styles.pinFieldLabel}>{`${length} digits`}</Text>
            <View style={styles.pinFieldRow}>
              <Text style={styles.pinFieldText}>{'•'.repeat(pin.length)}</Text>
              <Caret />
            </View>
          </View>
          <Text style={[styles.error, !error && styles.errorHidden]}>
            {error ?? ''}
          </Text>
        </View>
      </View>

      <View style={styles.pad}>
        {PAD_KEYS.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((key, ki) => (
              <Pressable
                key={ki}
                style={({ pressed }) => [
                  styles.padKey,
                  key === '' && styles.padKeyEmpty,
                  pressed && key !== '' && styles.padKeyPressed,
                ]}
                onPress={() => handleKey(key)}
                disabled={key === ''}
              >
                {key === '⌫' ? (
                  <Icons.backspace width={24} height={24} />
                ) : (
                  <Text variant="headlineMedium" style={styles.padKeyText}>
                    {key}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  fieldWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinField: {
    width: '66%',
    backgroundColor: theme.colors.surfaceVariant,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.onSurface,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 4,
  },
  pinFieldLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  pinFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  pinFieldText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    letterSpacing: 4,
  },
  caret: {
    width: 1,
    height: 18,
    backgroundColor: theme.colors.onSurface,
    marginLeft: 1,
  },
  error: {
    color: theme.colors.errorDark,
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    height: 20,
    paddingTop: 4,
  },
  errorHidden: {
    opacity: 0,
  },
  pad: {
    width: '100%',
    gap: 4,
  },
  padRow: {
    flexDirection: 'row',
    gap: 10,
  },
  padKey: {
    flex: 1,
    height: 43,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceElevated,
    boxShadow: '0px 1px 0px 0px rgba(0, 0, 0, 0.27)',
  },
  padKeyEmpty: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  padKeyPressed: {
    opacity: 0.6,
  },
  padKeyText: {
    color: theme.colors.onSurface,
    fontFamily: 'Roboto',
    fontWeight: '400',
    fontSize: 30,
    lineHeight: 30,
    textAlign: 'center',
  },
});
