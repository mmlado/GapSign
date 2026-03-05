import { DashboardAction } from "./types";
import { dashboardEntry as exportKeyEntry } from "../screens/ExportKeyScreen";
import { dashboardEntry as initCard } from "../screens/ExportKeyScreen";

export const dashboardActions: DashboardAction[] = [
  initCard,
  exportKeyEntry,
];