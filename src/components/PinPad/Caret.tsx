import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import theme from '../../theme';

export default function Caret() {
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

const styles = StyleSheet.create({
  caret: {
    width: 1,
    height: 18,
    backgroundColor: theme.colors.onSurface,
    marginLeft: 1,
  },
});
