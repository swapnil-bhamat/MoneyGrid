import React from "react";

export type FieldType = "text" | "number" | "date" | "select";

export interface FieldSchema<T> {
  name: keyof T & string;
  label: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: any;
  /** For "select" fields to dynamically query details from other Dexie tables */
  optionsQuery?: () => Promise<any[]>;
  optionsLabelKey?: string;
  optionsValueKey?: string;
}

export interface GenericCRUDConfig<T> {
  title: string;
  tableName: string; // The Dexie table key, e.g. "holders"
  columns: Array<{
    field: keyof T & string;
    headerName: string;
    renderCell?: (item: T) => React.ReactNode;
  }>;
  fields: FieldSchema<T>[];
}
