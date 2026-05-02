import React from 'react';
import { requireNativeComponent } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

export interface ReadCodeEvent {
  nativeEvent: { codeStringValue: string };
}

interface NativeCameraProps {
  style?: StyleProp<ViewStyle>;
  onReadCode?: (event: ReadCodeEvent) => void;
}

const NativeCamera = requireNativeComponent<NativeCameraProps>('CameraView');

interface CameraProps {
  style?: StyleProp<ViewStyle>;
  onReadCode?: (event: ReadCodeEvent) => void;
}

export function Camera({ style, onReadCode }: CameraProps) {
  return <NativeCamera style={style} onReadCode={onReadCode} />;
}
