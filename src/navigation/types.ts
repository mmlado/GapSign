import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ScanResult } from '../types';
import { NavigationProp } from '@react-navigation/native';

export type KeycardParams =
  | {
      operation: 'sign';
      signData: string; // hex-encoded bytes to sign
      derivationPath: string;
      chainId?: number;
      requestId?: string;
      dataType?: number;
    }
  | {
      operation: 'export_key';
      derivationPath: string;
    };
// Future: | { operation: 'change_pin' } | { operation: 'generate_key' }

export type RootStackParamList = {
  Dashboard: { toast?: string } | undefined;
  InitCard: undefined;
  QRScanner: undefined;
  TransactionDetail: { result: ScanResult };
  Keycard: KeycardParams;
  ExportKey: undefined;
  KeyPairMenu: undefined;
  KeySize: undefined;
  GenerateKey: { size: 12 | 24 };
  ConfirmKey: { words: string[] };
  FactoryReset: undefined;
  AddressMenu: undefined;
  AddressList: { coin: 'btc' | 'eth' };
  AddressDetail: { address: string; index: number };
  QRResult: {
    urString: string; // fully encoded UR string, ready for QR display
    label?: string; // text shown below the QR, e.g. "Scan with MetaMask"
  };
};

export type DashboardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Dashboard'
>;

export type InitCardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'InitCard'
>;

export type QRScannerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'QRScanner'
>;

export type TransactionDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TransactionDetail'
>;

export type KeycardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Keycard'
>;

export type QRResultScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'QRResult'
>;

export type ExportKeyScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ExportKey'
>;

export type FactoryResetSreenProps = NativeStackScreenProps<
  RootStackParamList,
  'FactoryReset'
>;

export type KeyPairMenuScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'KeyPairMenu'
>;

export type KeySizeScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'KeySize'
>;

export type ConfirmKeySreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ConfirmKey'
>;

export type GenerateKeyScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'GenerateKey'
>;

export type AddressMenuScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AddressMenu'
>;

export type AddressListScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AddressList'
>;

export type AddressDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AddressDetail'
>;

export type DashboardAction = {
  label: string;
  navigate: (navigation: NavigationProp<RootStackParamList>) => void;
};
