import React from 'react';
import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import InitCardScreen from '../screens/InitCardScreen';
import ExportKeyScreen from '../screens/ExportKeyScreen';
import FactoryResetScreen from '../screens/FactoryResetScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import KeycardScreen from '../screens/KeycardScreen';
import QRResultScreen from '../screens/QRResultScreen';
import theme from '../theme';
import type {RootStackParamList} from './types';

const headerStyle = {backgroundColor: theme.colors.background};
const headerTitleStyle = {fontWeight: '600' as const};
const defaultHeaderOptions: NativeStackNavigationOptions = {
  headerShown: true,
  title: '',
  headerStyle,
  headerTintColor: theme.colors.onSurface,
  headerTitleStyle,
  headerShadowVisible: false,
};

type Route = {
  name: keyof RootStackParamList;
  component: React.ComponentType<any>;
  options?: NativeStackNavigationOptions;
};

export const routes: Route[] = [
  {name: 'Dashboard', component: DashboardScreen},
  {name: 'InitCard', component: InitCardScreen, options: defaultHeaderOptions},
  {name: 'ExportKey', component: ExportKeyScreen, options: defaultHeaderOptions},
  {name: 'FactoryReset', component: FactoryResetScreen, options: defaultHeaderOptions},
  {name: 'QRScanner', component: QRScannerScreen, options: defaultHeaderOptions},
  {
    name: 'TransactionDetail',
    component: TransactionDetailScreen,
    options: {...defaultHeaderOptions, title: 'Review transaction'},
  },
  {name: 'Keycard', component: KeycardScreen, options: defaultHeaderOptions},
  {
    name: 'QRResult',
    component: QRResultScreen,
    options: {...defaultHeaderOptions, title: 'Signature'},
  },
];
