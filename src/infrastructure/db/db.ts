import Dexie, { Table } from "dexie";
import { logError, logInfo } from "@/services/logger";
import {
  Config,
  AssetPurpose,
  LoanType,
  Holder,
  SipType,
  Bucket,
  AssetClass,
  AssetSubClass,
  Goal,
  Account,
  Income,
  CashFlow,
  AssetHolding,
  Liability,
  AssetProjection,
  LiabilityProjection,
  InitializationData,
  CURRENT_DB_VERSION,
  UpcomingExpense,
  InsuranceType,
  Insurance,
} from "@/infrastructure/db/db.types";
import {
  defineSchema,
  transformLiabilityV8,
  transformLiabilityProjectionV8,
  transformAssetSubClassV8,
  transformHolderV13,
} from "@/infrastructure/db/dbMigrations";
import { historyService } from "@/services/historyService";
import { importDataToIndexedDB } from "@/services/driveSync";

// Re-export types for backward compatibility
export * from "@/infrastructure/db/db.types";

class AppDatabase extends Dexie {
  configs!: Table<Config>;
  assetPurposes!: Table<AssetPurpose>;
  loanTypes!: Table<LoanType>;
  holders!: Table<Holder>;
  sipTypes!: Table<SipType>;
  buckets!: Table<Bucket>;
  assetClasses!: Table<AssetClass>;
  assetSubClasses!: Table<AssetSubClass>;
  goals!: Table<Goal>;
  accounts!: Table<Account>;
  income!: Table<Income>;
  cashFlow!: Table<CashFlow>;
  assetsHoldings!: Table<AssetHolding>;
  liabilities!: Table<Liability>;
  assetsProjection!: Table<AssetProjection>;
  liabilitiesProjection!: Table<LiabilityProjection>;
  upcomingExpenses!: Table<UpcomingExpense>;
  insuranceTypes!: Table<InsuranceType>;
  insurances!: Table<Insurance>;

  constructor() {
    super("financeDb");
    defineSchema(this);
  }
}

// Initialize database
async function initializeDexieDb() {
  try {
    const db = new AppDatabase();

    // Initialize History Service with DB instance
    historyService.setDb(db);

    // Add Hooks for Undo/Redo
    db.tables.forEach((table) => {
      table.hook("creating", function (_, obj) {
        // onsuccess provides the key if it was auto-incremented
        this.onsuccess = function (key) {
          historyService.trackOperation({
            type: "add",
            table: table.name,
            key: key,
            data: obj,
          });
        };
      });

      table.hook("updating", function (_, primKey, obj) {
        // obj is the old data
        historyService.trackOperation({
          type: "update",
          table: table.name,
          key: primKey,
          data: obj, // Store old data for undo
        });
      });

      table.hook("deleting", function (primKey, obj) {
        historyService.trackOperation({
          type: "delete",
          table: table.name,
          key: primKey,
          data: obj, // Store old data for undo (re-add)
        });
      });
    });

    db.on("ready", () => {
      logInfo("Database ready, current version:", db.verno);
    });

    return db;
  } catch (error) {
    logError("Failed to initialize database:", { error });
    throw error;
  }
}

// Export the database instance
export const db = await initializeDexieDb();

export function sanitizeData(data: InitializationData): InitializationData {
  const dataVersion = data.version || 0;

  // Log version mismatch if any
  if (dataVersion !== CURRENT_DB_VERSION) {
    logInfo(
      `Sanitizing data from version ${dataVersion} to ${CURRENT_DB_VERSION}`
    );
  }

  // Ensure all arrays exist
  const sanitized: InitializationData = {
    version: CURRENT_DB_VERSION,
    configs: data.configs || [],
    assetPurpose: data.assetPurpose || [],
    loanType: data.loanType || [],
    holders: data.holders || [],
    sipTypes: data.sipTypes || [],
    buckets: data.buckets || [],
    assetClasses: data.assetClasses || [],
    assetSubClasses: data.assetSubClasses || [],
    goals: data.goals || [],
    accounts: data.accounts || [],
    income: data.income || [],
    cashFlow: data.cashFlow || [],
    assetsHoldings: data.assetsHoldings || [],
    liabilities: data.liabilities || [],
    assetsProjection: data.assetsProjection || [],
    liabilitiesProjection: data.liabilitiesProjection || [],
    upcomingExpenses: data.upcomingExpenses || [],
    insuranceTypes: data.insuranceTypes || [],
    insurances: data.insurances || [],
  };

  // Apply migrations for imported data (DRY pure transformers)
  if (dataVersion < 8) {
    sanitized.liabilities = sanitized.liabilities.map(transformLiabilityV8);
    sanitized.liabilitiesProjection = sanitized.liabilitiesProjection.map(transformLiabilityProjectionV8);
    sanitized.assetSubClasses = sanitized.assetSubClasses.map(transformAssetSubClassV8);
  }

  if (dataVersion < 13) {
    sanitized.holders = sanitized.holders.map(transformHolderV13);
  }

  return sanitized;
}

export async function initializeDatabase(
  data: InitializationData,
  overwrite = true
) {
  return importDataToIndexedDB(data, overwrite);
}

export async function resetDatabase() {
  try {
    await db.transaction("rw", db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });
    // No need to remove localStorage items anymore
    logInfo("Database reset successfully");
  } catch (error) {
    logError("Failed to reset database:", { error });
    throw error;
  }
}
