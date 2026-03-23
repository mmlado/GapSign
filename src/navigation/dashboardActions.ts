import { DashboardAction } from './types';

import { dashboardEntry as exportKeyEntry } from '../screens/ExportKeyScreen';
import { dashboardEntry as factoryReset } from '../screens/FactoryResetScreen';
import { dashboardEntry as initCard } from '../screens/InitCardScreen';
import { dashboardEntry as addressMenu } from '../screens/address/AddressMenuScreen';
import { dashboardEntry as keyPairMenu } from '../screens/keypair/KeyPairMenuScreen';
import { dashboardEntry as secretsMenu } from '../screens/secrets/SecretsMenuScreen';

export const dashboardActions: DashboardAction[] = [
  initCard,
  exportKeyEntry,
  keyPairMenu,
  addressMenu,
  secretsMenu,
  factoryReset,
];
