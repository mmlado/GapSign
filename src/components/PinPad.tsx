import { useCallback, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "react-native-paper";
import { Icons } from "../assets/icons";

interface PinPadProps {
  title: string;
  onComplete: (pin: string) => void;
  error?: string;
  onType?: () => void;
}

const PIN_LENGTH = 6;

const PAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function PinPad({title, onComplete, error, onType}: PinPadProps) {
  const [pin, setPin] = useState('');
  const { width } = useWindowDimensions();
  const scale = width / 360;
  
  const handleKey = useCallback(
    (key: string) => {
      if (key !== '') {
        onType?.();
      }
      if (key === '') {
        return
      }
      if (key === '⌫') {
        setPin(p => p.slice(0, -1));
      } else if (pin.length < PIN_LENGTH) {
        const next = pin + key;
        setPin(next);
        if (next.length === PIN_LENGTH) {
          onComplete(next);
          setPin('');
        }
      }
    },
    [pin, onComplete],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {title}
        </Text>
        <View style={styles.dotsWrapper}>
          <View style={styles.dots}>
            {Array.from({length: PIN_LENGTH}).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < pin.length && styles.dotFilled]}
              />
            ))}
          </View>
          <Text style={[styles.error, {fontSize: 12 * scale, lineHeight: 16 * scale, height: 20 * scale}, !error && styles.errorHidden]}>
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
                style={({pressed}) => [
                  styles.padKey,
                  key === '' && styles.padKeyEmpty,
                  pressed && key !== '' && styles.padKeyPressed,
                ]}
                onPress={() => handleKey(key)}
                disabled={key === ''}>
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
    backgroundColor: '#121212',
  },
  header: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  title: {
    color: '#ffffff',
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.567, // -2.1% of 27px
    marginBottom: 8,
  },
  dotsWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotFilled: {
    backgroundColor: '#ffffff',
  },
  error: {
    color: '#BA434D',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    height: 20,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  errorHidden: {
    opacity: 0,
  },
  pad: {
    width: '100%',
    gap: 4,
  },
  backspaceIcon: {
    width: 32,
    height: 32,
    tintColor: '#ffffff',
  },
  padRow: {
    flexDirection: 'row',
  },
  padKey: {
    flex: 1,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padKeyEmpty: {},
  padKeyPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 48,
  },
  padKeyText: {
    color: '#ffffff',
    fontWeight: '300',
  },
});
