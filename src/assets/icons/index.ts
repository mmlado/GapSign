import React from 'react';
import MaterialDesignIcons, {
  type MaterialDesignIconsIconName,
} from '@react-native-vector-icons/material-design-icons';

import theme from '../../theme';

import KeycardIcon from './keycard.svg';
import NfcDefault from './nfc/default.svg';
import NfcActivate from './nfc_activate.svg';
import QrIcon from './qr.svg';
import ScanIcon from './scan.svg';

type IconProps = { width?: number; height?: number; color?: string };

function mdi(name: MaterialDesignIconsIconName, defaultColor: string) {
  return function MdiIcon({ width = 24, color = defaultColor }: IconProps) {
    return React.createElement(MaterialDesignIcons, {
      name,
      size: width,
      color,
    });
  };
}

export const Icons = {
  scan: ScanIcon,
  keycard: KeycardIcon,
  backspace: mdi('backspace-outline', theme.colors.onSurface),
  chevronRight: mdi('chevron-right', theme.colors.onSurface),
  copy: mdi('content-copy', theme.colors.onSurface),
  qr: QrIcon,
  nfcActivate: NfcActivate,
  checkmark: mdi('check', theme.colors.secondary),
  exclamation: mdi('alert-circle', theme.colors.errorDark),
  nfc: {
    default: NfcDefault,
    success: mdi('check-circle-outline', theme.colors.secondary),
    failure: mdi('close-circle-outline', theme.colors.error),
  },
};
