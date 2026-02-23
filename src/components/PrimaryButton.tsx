import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SvgProps } from "react-native-svg";
import { Text } from "react-native-paper";

type Props = {
  label: string;
  onPress: () => void;
  icon?: React.FC<SvgProps>;
};

export default function PrimaryButton({label, onPress, icon: Icon}: Props) {
    const handlePress = useCallback(() => {
      onPress();
    }, [onPress]);

    return (
      <Pressable
        style={styles.button}
        android_ripple={{color: 'rgba(255,255,255,0.3)'}}
        onPress={handlePress}>
        <View style={styles.content}>
          <Text variant="labelLarge" style={styles.text}>
            {label}
          </Text>
          {Icon && <Icon width={24} height={24} />}
        </View>
      </Pressable>
    )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF6400',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    minHeight: 40,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
  },
});