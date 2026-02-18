import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ScanResult} from '../types';

export type SigningStackParamList = {
  QRScanner: undefined;
  TransactionDetail: {result: ScanResult};
};

export type QRScannerScreenProps = NativeStackScreenProps<
  SigningStackParamList,
  'QRScanner'
>;

export type TransactionDetailScreenProps = NativeStackScreenProps<
  SigningStackParamList,
  'TransactionDetail'
>;
