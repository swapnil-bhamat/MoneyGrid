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
