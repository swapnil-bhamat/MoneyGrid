import React, { createContext, useContext, ReactNode } from "react";
import { useDashboardData } from "../hooks/useDashboardData";

type DashboardDataContextType = ReturnType<typeof useDashboardData>;

const DashboardDataContext = createContext<DashboardDataContextType | null>(null);

export const DashboardDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const data = useDashboardData();

  return (
    <DashboardDataContext.Provider value={data}>
      {children}
    </DashboardDataContext.Provider>
  );
};

export const useSharedDashboardData = () => {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error(
      "useSharedDashboardData must be used within a DashboardDataProvider"
    );
  }
  return context;
};
