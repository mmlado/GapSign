import React from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import InitCardScreen from '../screens/InitCardScreen';
import ExportKeyScreen from '../screens/ExportKeyScreen';
import FactoryResetScreen from '../screens/FactoryResetScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import KeycardScreen from '../screens/KeycardScreen';
import QRResultScreen from '../screens/QRResultScreen';
import theme from '../theme';
import type { RootStackParamList } from './types';
import KeyPairMenuScreen from '../screens/keypair/KeyPairMenuScreen';
import GenerateKeyScreen from '../screens/keypair/GenerateKeyScreen';
import KeySizeScreen from '../screens/keypair/KeySizeScreen';
import ConfirmKeyScreen from '../screens/keypair/ConfirmKeyScreen';
import AddressesMenuScreen from '../screens/address/AddressMenuScreen';
import AddressListScreen from '../screens/address/AddressListScreen';
import AddressDetailScreen from '../screens/address/AddressDetailScreen';

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
  {
    name: 'InitCard',
    component: InitCardScreen,
    options: defaultHeaderOptions,
  },
  {
    name: 'ExportKey',
    component: ExportKeyScreen,
    options: defaultHeaderOptions,
  },
  {
    name: 'KeyPairMenu',
    component: KeyPairMenuScreen,
    options: defaultHeaderOptions,
  },
  { name: 'KeySize', component: KeySizeScreen, options: defaultHeaderOptions },
  {
    name: 'GenerateKey',
    component: GenerateKeyScreen,
    options: defaultHeaderOptions,
  },
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
  {
    name: 'ConfirmKey',
    component: ConfirmKeyScreen,
    options: defaultHeaderOptions,
  },
  {
    name: 'FactoryReset',
    component: FactoryResetScreen,
    options: defaultHeaderOptions,
  },
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
    options: { ...defaultHeaderOptions, title: 'Signature' },
  },
];
