import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';

import theme from '../theme';
import type { RootStackParamList } from './types';

// Top-level screens
import DashboardScreen from '../screens/DashboardScreen';
import ExportKeyScreen from '../screens/ExportKeyScreen';
import FactoryResetScreen from '../screens/FactoryResetScreen';
import InitCardScreen from '../screens/InitCardScreen';
import KeycardScreen from '../screens/KeycardScreen';
import QRResultScreen from '../screens/QRResultScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';

// Address screens
import AddressDetailScreen from '../screens/address/AddressDetailScreen';
import AddressListScreen from '../screens/address/AddressListScreen';
import AddressesMenuScreen from '../screens/address/AddressMenuScreen';

// Key pair screens
import ConfirmKeyScreen from '../screens/keypair/ConfirmKeyScreen';
import GenerateKeyScreen from '../screens/keypair/GenerateKeyScreen';
import KeyPairMenuScreen from '../screens/keypair/KeyPairMenuScreen';
import KeySizeScreen from '../screens/keypair/KeySizeScreen';
import MnemonicScreen from '../screens/keypair/MnemonicScreen';

// Secrets screens
import ChangeSecretScreen from '../screens/secrets/ChangeSecretScreen';
import SecretsMenuScreen from '../screens/secrets/SecretsMenuScreen';

const headerStyle = { backgroundColor: theme.colors.background };
const headerTitleStyle = { fontWeight: '600' as const };
const defaultHeaderOptions: NativeStackNavigationOptions = {
  headerShown: true,
  title: '',
  headerStyle,
  headerTintColor: theme.colors.onSurface,
  headerTitleStyle,
  headerTitleAlign: 'center',
  headerShadowVisible: false,
};

type Route = {
  name: keyof RootStackParamList;
  component: React.ComponentType<any>;
  options?: NativeStackNavigationOptions;
};

export const routes: Route[] = [
  { name: 'Dashboard', component: DashboardScreen },

  // Keycard operations
  {
    name: 'InitCard',
    component: InitCardScreen,
    options: defaultHeaderOptions,
  },
  {
    name: 'FactoryReset',
    component: FactoryResetScreen,
    options: defaultHeaderOptions,
  },
  {
    name: 'ExportKey',
    component: ExportKeyScreen,
    options: { ...defaultHeaderOptions, title: 'Chain selection' },
  },

  // Key pair flow
  {
    name: 'KeyPairMenu',
    component: KeyPairMenuScreen,
    options: { ...defaultHeaderOptions, title: 'Add keypair' },
  },
  {
    name: 'KeySize',
    component: KeySizeScreen,
    options: { ...defaultHeaderOptions, title: 'Generate new key pair' },
  },
  {
    name: 'GenerateKey',
    component: GenerateKeyScreen,
    options: { ...defaultHeaderOptions, title: 'Backup recovery phrase' },
  },
  {
    name: 'ConfirmKey',
    component: ConfirmKeyScreen,
    options: defaultHeaderOptions,
  },
  {
    name: 'Mnemonic',
    component: MnemonicScreen,
    options: defaultHeaderOptions,
  },

  // Secrets flow
  {
    name: 'SecretsMenu',
    component: SecretsMenuScreen,
    options: { ...defaultHeaderOptions, title: 'Secrets' },
  },
  {
    name: 'ChangeSecret',
    component: ChangeSecretScreen,
    options: defaultHeaderOptions,
  },

  // Address flow
  {
    name: 'AddressMenu',
    component: AddressesMenuScreen,
    options: { ...defaultHeaderOptions, title: 'Addresses' },
  },
  {
    name: 'AddressList',
    component: AddressListScreen,
    options: defaultHeaderOptions,
  },
  {
    name: 'AddressDetail',
    component: AddressDetailScreen,
    options: defaultHeaderOptions,
  },

  // QR / signing flow
  {
    name: 'QRScanner',
    component: QRScannerScreen,
    options: defaultHeaderOptions,
  },
  {
    name: 'TransactionDetail',
    component: TransactionDetailScreen,
    options: { ...defaultHeaderOptions, title: 'Review transaction' },
  },
  { name: 'Keycard', component: KeycardScreen, options: defaultHeaderOptions },
  {
    name: 'QRResult',
    component: QRResultScreen,
    options: { ...defaultHeaderOptions, title: 'Show signature to the wallet' },
  },
];
