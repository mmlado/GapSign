import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import theme from '../theme';

import { Camera, type ReadCodeEvent } from './Camera';

type Props = {
  onReadCode: (event: ReadCodeEvent) => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export default function CameraView({ onReadCode, style, children }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Camera style={StyleSheet.absoluteFill} onReadCode={onReadCode} />
      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>
      {children}
    </View>
  );
}

const CORNER = 24;
const BORDER = 3;

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cameraBackground,
    flex: 1,
  },
  viewfinderContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  viewfinder: {
    height: 250,
    width: 250,
  },
  corner: {
    height: CORNER,
    position: 'absolute',
    width: CORNER,
  },
  cornerTL: {
    borderColor: theme.colors.primary,
    borderLeftWidth: BORDER,
    borderTopLeftRadius: 8,
    borderTopWidth: BORDER,
    left: 0,
    top: 0,
  },
  cornerTR: {
    borderColor: theme.colors.primary,
    borderRightWidth: BORDER,
    borderTopRightRadius: 8,
    borderTopWidth: BORDER,
    right: 0,
    top: 0,
  },
  cornerBL: {
    bottom: 0,
    borderBottomLeftRadius: 8,
    borderBottomWidth: BORDER,
    borderColor: theme.colors.primary,
    borderLeftWidth: BORDER,
    left: 0,
  },
  cornerBR: {
    bottom: 0,
    borderBottomRightRadius: 8,
    borderBottomWidth: BORDER,
    borderColor: theme.colors.primary,
    borderRightWidth: BORDER,
    right: 0,
  },
});
