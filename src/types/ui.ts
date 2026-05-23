import React from "react";

export interface BaseRecord {
  id: string | number;
  [key: string]: any;
}

export interface Column<T> {
  field: keyof T;
  headerName: string;
  required?: boolean;
  renderCell?: (item: T) => React.ReactNode;
  priority?: "high" | "medium" | "low"; // For responsive display
}
