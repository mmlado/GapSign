import { NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ScanResult } from '../types';

export type KeycardParams =
  | {
      operation: 'sign';
      signMode: 'eth';
      signData: string; // hex-encoded bytes to sign
      derivationPath: string;
      chainId?: number;
      requestId?: string;
      dataType?: number;
    }
  | {
      operation: 'sign';
      signMode: 'btc';
      psbtHex: string;
    }
  | {
      operation: 'sign';
      signMode: 'btc-message';
      requestId: string;
      signDataHex: string;
      derivationPath: string;
      address?: string;
      origin?: string;
    }
  | {
      operation: 'export_key';
      derivationPath: string;
      source?: string;
    };
// Future: | { operation: 'change_pin' } | { operation: 'generate_key' }

export type SecretType = 'pin' | 'puk' | 'pairing';

export type RootStackParamList = {
  Dashboard: { toast?: string } | undefined;
  InitCard: undefined;
  SecretsMenu: undefined;
  ChangeSecret: { secretType: SecretType };
  QRScanner: undefined;
  TransactionDetail: { result: ScanResult };
  Keycard: KeycardParams;
  ExportKey: undefined;
  KeyPairMenu: undefined;
  KeySize: undefined;
  GenerateKey: { size: 12 | 24; passphrase?: boolean };
  ConfirmKey: { words: string[]; passphrase?: string };
  ImportKey: undefined;
  FactoryReset: undefined;
  AddressMenu: undefined;
  AddressList: { coin: 'btc' | 'eth' };
  AddressDetail: { address: string; index: number };
  QRResult: {
    urString: string; // fully encoded UR string, ready for QR display
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

export type ImportKeyScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ImportKey'
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

export type SecretsMenuScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'SecretsMenu'
>;

export type ChangeSecretScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ChangeSecret'
>;

export type DashboardAction = {
  label: string;
  navigate: (navigation: NavigationProp<RootStackParamList>) => void;
};
