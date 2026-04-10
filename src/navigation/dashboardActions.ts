import { DashboardAction } from './types';

import { dashboardEntry as exportKeyEntry } from '../screens/ExportKeyScreen';
import { dashboardEntry as keycardMenu } from '../screens/KeycardMenuScreen';
import { dashboardEntry as addressMenu } from '../screens/address/AddressMenuScreen';

export const dashboardActions: DashboardAction[] = [
  exportKeyEntry,
  addressMenu,
  keycardMenu,
];
