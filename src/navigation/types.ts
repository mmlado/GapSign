import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ScanResult} from '../types';
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
  Dashboard: undefined;
  QRScanner: undefined;
  TransactionDetail: {result: ScanResult};
  Keycard: KeycardParams;
  ExportKey: undefined;
  QRResult: {
    urString: string; // fully encoded UR string, ready for QR display
    label?: string;   // text shown below the QR, e.g. "Scan with MetaMask"
  };
};


export type DashboardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Dashboard'
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

export type DashboardAction = {
  label: string;
  navigate: (navigation: NavigationProp<RootStackParamList>) => void;
};

