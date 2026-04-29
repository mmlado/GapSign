/* istanbul ignore file */
import { NativeModules, Platform } from 'react-native';

const nativeBuildConfig = NativeModules.BuildConfig as
  | { INTERNET_ENABLED: boolean }
  | undefined;

// iOS has no offline flavor — internet is always available there
export const INTERNET_ENABLED: boolean =
  Platform.OS === 'android'
    ? nativeBuildConfig?.INTERNET_ENABLED ?? true
    : true;
