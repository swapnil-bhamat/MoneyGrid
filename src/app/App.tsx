import {
  RouterProvider,
  createBrowserRouter,
  Navigate,
} from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { AuthProvider } from "@/contexts/authContext";

import Layout from "@/components/layout/Layout";

import CashFlowPage from "@/pages/transactions/CashFlowPage";
import IncomePage from "@/pages/transactions/IncomePage";
import SettingsPage from "@/pages/backups/SettingsPage";
import ToolsPage from "@/pages/analytics/ToolsPage";
import Dashboard from "@/pages/analytics/Dashboard";
import FirePage from "@/pages/analytics/FirePage";
import AssetsHoldingsPage from "@/pages/accounts/AssetsHoldingsPage";
import GoalsPage from "@/pages/budgets/GoalsPage";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import AboutPage from "@/pages/shared/AboutPage";
import FinanceRules from "@/pages/shared/FinanceRules";
import AssetAllocationProjectionPage from "@/pages/analytics/AssetAllocationProjectionPage";
import { BioLockProvider } from "@/contexts/bioLockContext";
import { DashboardDataProvider } from "@/contexts/DashboardDataContext";
import { ThemeProvider } from "@/contexts/themeContext";
import BioLockScreen from "@/components/auth/BioLockScreen";
import LiabilitiesPage from "@/pages/accounts/LiabilitiesPage";
import UpcomingExpensesPage from "@/pages/transactions/UpcomingExpensesPage";
import InsurancesPage from "@/pages/transactions/InsurancesPage";

const routes: RouteObject[] = [
  {
    path: "/",
    Component: Layout,
    children: [
      { path: "", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: Dashboard },
      { path: "fire", Component: FirePage },
      { path: "liabilities", Component: LiabilitiesPage },
      
      { path: "cash-flow", Component: CashFlowPage },
      { path: "income", Component: IncomePage },
      { path: "upcoming-expenses", Component: UpcomingExpensesPage },
      { path: "insurances", Component: InsurancesPage },

      { path: "settings", Component: SettingsPage },
      { path: "assets-holdings", Component: AssetsHoldingsPage },
      { path: "goals", Component: GoalsPage },
      { path: "about", Component: AboutPage },
      { path: "knowledge-centre", Component: FinanceRules },
      { path: "tools", Component: ToolsPage },
      {
        path: "networth-projection",
        Component: AssetAllocationProjectionPage,
      },
    ],
  },
];

import { useEffect } from "react";
import { getAppConfig, saveAppConfig, CONFIG_KEYS } from "@/services/configService";
import { STORAGE_KEYS } from "@/utils/constants";
import packageJson from "../../package.json";
const APP_VERSION = packageJson.version;

const isNewerVersion = (v1: string, v2: string): boolean => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
};

const router = createBrowserRouter(routes);

function App() {
  useEffect(() => {
    const syncCurrency = async () => {
      try {
        const currencyInDb = await getAppConfig(CONFIG_KEYS.BASE_CURRENCY);
        if (currencyInDb) {
          localStorage.setItem(STORAGE_KEYS.CURRENCY, currencyInDb);
        } else {
          // Default to INR (Rupees)
          await saveAppConfig(CONFIG_KEYS.BASE_CURRENCY, "INR");
          localStorage.setItem(STORAGE_KEYS.CURRENCY, "INR");
        }
      } catch (err) {
        console.error("Failed to sync currency config", err);
      }
    };
    const syncVersion = async () => {
      try {
        const versionInDb = await getAppConfig(CONFIG_KEYS.APP_VERSION);
        if (!versionInDb || isNewerVersion(APP_VERSION, versionInDb)) {
          await saveAppConfig(CONFIG_KEYS.APP_VERSION, APP_VERSION);
        }
      } catch (err) {
        console.error("Failed to sync version config", err);
      }
    };
    syncCurrency();
    syncVersion();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BioLockProvider>
          <DashboardDataProvider>
            <ThemeProvider>
              <BioLockScreen />
              <RouterProvider router={router} />
            </ThemeProvider>
          </DashboardDataProvider>
        </BioLockProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
