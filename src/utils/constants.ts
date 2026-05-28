/**
 * Local Storage Keys used across the application.
 */
export const STORAGE_KEYS = {
  CURRENCY: "moneygrid_currency",
  GOOGLE_DRIVE_TOKEN: "googleDriveToken",
  BIO_AUTH_ENABLED: "bio_auth_enabled",
  BIO_AUTH_CREDENTIAL_ID: "bio_auth_credential_id",
  BIO_AUTH_PIN_HASH: "bio_auth_pin_hash",
  DEVICE_ENCRYPTION_KEY: "device_encryption_key",
  DB_VERSION: "dbVersion",
  BOOTSWATCH_THEME: "bootswatch_theme",
  UNDO_STACK: "undo_stack",
  REDO_STACK: "redo_stack",
} as const;

/**
 * Core Financial Categories normalized names.
 */
export const FINANCIAL_CATEGORIES = {
  NEED: "need",
  WANT: "want",
  SAVINGS: "savings",
} as const;

/**
 * Budgeting Rules (e.g., 50/30/20 rule parameters).
 */
export const BUDGET_RULES = {
  NEED_LIMIT: 50,
  WANT_LIMIT: 20,
  SAVINGS_FLOOR: 30,
} as const;


