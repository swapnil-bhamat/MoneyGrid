export interface BaseRecord {
  id: number;
  [key: string]: unknown;
}

export interface Column<T extends BaseRecord> {
  field: keyof T;
  headerName: string;
  width?: string;
  style?: {
    width: string;
  };
  format?: (value: unknown) => string;
  renderCell?: (value: T) => React.ReactNode;
}
