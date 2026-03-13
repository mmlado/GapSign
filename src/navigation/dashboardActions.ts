import { DashboardAction } from './types';
import { dashboardEntry as exportKeyEntry } from '../screens/ExportKeyScreen';
import { dashboardEntry as initCard } from '../screens/InitCardScreen';
import { dashboardEntry as keyPairMenu } from '../screens/keypair/KeyPairMenuScreen';
import { dashboardEntry as factoryReset } from '../screens/FactoryResetScreen';
import { dashboardEntry as addressMenu } from '../screens/address/AddressMenuScreen';

export const dashboardActions: DashboardAction[] = [
  initCard,
  exportKeyEntry,
  keyPairMenu,
  addressMenu,
  factoryReset,
];
