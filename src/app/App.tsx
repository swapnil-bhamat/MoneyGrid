import {
  RouterProvider,
  createBrowserRouter,
  Navigate,
} from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { AuthProvider } from "@/domains/auth/contexts/authContext";

import Layout from "@/shared/components/Layout";

import CashFlowPage from "@/domains/transactions/pages/CashFlowPage";
import IncomePage from "@/domains/transactions/pages/IncomePage";
import SettingsPage from "@/domains/backups/pages/SettingsPage";
import ToolsPage from "@/domains/analytics/pages/ToolsPage";
import Dashboard from "@/domains/analytics/pages/Dashboard";
import FirePage from "@/domains/analytics/pages/FirePage";
import AssetsHoldingsPage from "@/domains/accounts/pages/AssetsHoldingsPage";
import GoalsPage from "@/domains/budgets/pages/GoalsPage";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import AboutPage from "@/shared/pages/AboutPage";
import FinanceRules from "@/shared/pages/FinanceRules";
import AssetAllocationProjectionPage from "@/domains/analytics/pages/AssetAllocationProjectionPage";
import { BioLockProvider } from "@/domains/auth/contexts/bioLockContext";
import { DashboardDataProvider } from "@/domains/analytics/contexts/DashboardDataContext";
import { ThemeProvider } from "@/shared/services/themeContext";
import BioLockScreen from "@/domains/auth/components/BioLockScreen";
import LiabilitiesPage from "@/domains/accounts/pages/LiabilitiesPage";
import UpcomingExpensesPage from "@/domains/transactions/pages/UpcomingExpensesPage";
import InsurancesPage from "@/domains/transactions/pages/InsurancesPage";

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

const router = createBrowserRouter(routes);

function App() {
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
