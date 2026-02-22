import React, {useEffect, useRef} from 'react';
import {Animated, Modal, Pressable, StyleSheet, View} from 'react-native';
import {Icon, Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  status: string;
  onCancel: () => void;
};

function PulseRing({delay, size}: {delay: number; size: number}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const scale = anim.interpolate({inputRange: [0, 1], outputRange: [0.4, 1]});
  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.7, 0.35, 0],
  });

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{scale}],
        },
      ]}
    />
  );
}

export default function NFCBottomSheet({visible, status, onCancel}: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [visible, slideAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          {/* drag handle */}
          <View style={styles.handle} />

          {/* pulsing NFC icon */}
          <View style={styles.iconArea}>
            <PulseRing delay={0} size={140} />
            <PulseRing delay={500} size={190} />
            <PulseRing delay={1000} size={240} />
            <Icon source="nfc-variant" size={72} color="#bb86fc" />
          </View>

          <Text variant="titleLarge" style={styles.title}>
            Tap your Keycard
          </Text>
          <Text variant="bodyMedium" style={styles.status}>
            {status}
          </Text>

          <Pressable
            style={styles.cancelButton}
            android_ripple={{color: 'rgba(187,134,252,0.15)'}}
            onPress={onCancel}>
            <Text variant="labelLarge" style={styles.cancelText}>
              Cancel
            </Text>
          </Pressable>
        </Animated.View>
      </View>
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
  iconArea: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#bb86fc',
  },
  title: {
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 8,
  },
  status: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 36,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  cancelText: {
    color: '#bb86fc',
  },
});
