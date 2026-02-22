import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ScanResult} from '../types';

export type KeycardParams =
  | {
      operation: 'sign';
      signData: string; // hex-encoded bytes to sign
      derivationPath: string;
      chainId?: number;
      requestId?: string;
      dataType?: number;
    };
// Future: | { operation: 'change_pin' } | { operation: 'generate_key' }

export type SigningStackParamList = {
  Dashboard: undefined;
  QRScanner: undefined;
  TransactionDetail: {result: ScanResult};
  Keycard: KeycardParams;
  QRResult: {
    urString: string; // fully encoded UR string, ready for QR display
    label?: string;   // text shown below the QR, e.g. "Scan with MetaMask"
  };
};


export type DashboardScreenProps = NativeStackScreenProps<
  SigningStackParamList,
  'Dashboard'
>;

export type QRScannerScreenProps = NativeStackScreenProps<
  SigningStackParamList,
  'QRScanner'
>;

export type TransactionDetailScreenProps = NativeStackScreenProps<
  SigningStackParamList,
  'TransactionDetail'
>;

export type KeycardScreenProps = NativeStackScreenProps<
  SigningStackParamList,
  'Keycard'
>;

export type QRResultScreenProps = NativeStackScreenProps<
  SigningStackParamList,
  'QRResult'
>;
