import { DashboardAction } from './types';
import { dashboardEntry as exportKeyEntry } from '../screens/ExportKeyScreen';
import { dashboardEntry as initCard } from '../screens/InitCardScreen';
import { dashboardEntry as factoryReset } from '../screens/FactoryResetScreen';

export const dashboardActions: DashboardAction[] = [
  initCard,
  exportKeyEntry,
  factoryReset,
];
