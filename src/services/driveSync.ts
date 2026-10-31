import { logError, logInfo } from "@/services/logger";
import { db, sanitizeData } from "@/infrastructure/db/db";
import type { InitializationData } from "@/infrastructure/db/db";
import { findFile, readFile, uploadJsonFile } from "./googleDrive";
import { historyService } from "./historyService";

const DATA_FILE_NAME = "data.json";
let syncInProgress = false;
// Track the last successful sync timestamp
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export const DB_TABLE_REGISTRY = [
  { jsonKey: "configs", table: "configs" },
  { jsonKey: "assetPurpose", table: "assetPurposes" },
  { jsonKey: "loanType", table: "loanTypes" },
  { jsonKey: "holders", table: "holders" },
  { jsonKey: "sipTypes", table: "sipTypes" },
  { jsonKey: "buckets", table: "buckets" },
  { jsonKey: "assetClasses", table: "assetClasses" },
  { jsonKey: "assetSubClasses", table: "assetSubClasses" },
  { jsonKey: "goals", table: "goals" },
  { jsonKey: "accounts", table: "accounts" },
  { jsonKey: "income", table: "income" },
  { jsonKey: "cashFlow", table: "cashFlow" },
  { jsonKey: "assetsHoldings", table: "assetsHoldings" },
  { jsonKey: "liabilities", table: "liabilities" },
  { jsonKey: "assetsProjection", table: "assetsProjection" },
  { jsonKey: "liabilitiesProjection", table: "liabilitiesProjection" },
  { jsonKey: "upcomingExpenses", table: "upcomingExpenses" },
  { jsonKey: "insuranceTypes", table: "insuranceTypes" },
  { jsonKey: "insurances", table: "insurances" },
] as const;

export async function initializeFromDrive(
  shouldRestore = false
): Promise<boolean> {
  try {
    if (shouldRestore) {
      const existingFile = await findFile(DATA_FILE_NAME);
      if (existingFile) {
        const data = await readFile<InitializationData>(existingFile.id);
        if (data.assetSubClasses.length === 0) {
          logInfo("No existing data file found in Google Drive");
          return false;
        }
        await importDataToIndexedDB(data);
        logInfo("Successfully restored data from Google Drive");
        return true;
      }
      logInfo("No existing data file found in Google Drive");
      return false;
    }

    // Load initial data from public/data.json
    try {
      logInfo("Attempting to load data.json from public folder...");
      const response = await fetch("/data.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const initialData = await response.json();
      logInfo("Successfully loaded initial data:", initialData);

      // Create initial data in Google Drive if authenticated
      try {
        logInfo("Uploading initial data to Google Drive...");
        await uploadJsonFile(initialData, DATA_FILE_NAME);
        logInfo("Successfully uploaded initial data to Google Drive");
      } catch (uploadError) {
        logInfo("Skipping Google Drive upload during initialization (not authenticated or offline):", { uploadError });
      }
      logInfo(
        "Importing default data into IndexedDB..."
      );
      await importDataToIndexedDB(initialData);
      logInfo("Created new data file in Google Drive with default data");
      return true;
    } catch (error) {
      logError("Failed to load initial data:", { error });
      // Fallback to empty data structure
      const emptyData = {
        version: db.verno,
        configs: [],
        assetPurpose: [],
        loanType: [],
        holders: [],
        sipTypes: [],
        buckets: [],
        assetClasses: [],
        assetSubClasses: [],
        goals: [],
        accounts: [],
        income: [],
        cashFlow: [],
        assetsHoldings: [],
        liabilities: [],
        assetsProjection: [],
        liabilitiesProjection: [],
        upcomingExpenses: [],
        insuranceTypes: [],
        insurances: [],
      };
      await uploadJsonFile(emptyData, DATA_FILE_NAME);
      await importDataToIndexedDB(emptyData);
      logInfo("Created new data file in Google Drive with empty data");
      return true;
    }
  } catch (error) {
    logError("Failed to initialize from Drive:", { error });
    return false;
  }
}

export async function importDataToIndexedDB(
  data: InitializationData,
  clearExisting = true
): Promise<void> {
  try {
    logInfo("Starting data import to IndexedDB...");
    
    // Sanitize data before importing
    const sanitizedData = sanitizeData(data);
    historyService.pauseTracking();
    
    await db.transaction("rw", db.tables, async () => {
      if (clearExisting) {
        logInfo("Clearing existing data from tables...");
        await Promise.all(db.tables.map((table) => table.clear()));
        logInfo("Tables cleared successfully");
      }

      // Import new data
      logInfo("Beginning data import via table registry...");
      for (const { jsonKey, table } of DB_TABLE_REGISTRY) {
        const rows = (sanitizedData as any)[jsonKey];
        if (rows && rows.length > 0) {
          await (db as any)[table].bulkAdd(rows);
        }
      }
    });
    logInfo("Successfully imported data to IndexedDB");
  } catch (error) {
    logError("Failed to import data to IndexedDB:", { error });
    throw error;
  } finally {
    historyService.resumeTracking();
  }
}

export async function exportDataFromIndexedDB(): Promise<InitializationData> {
  try {
    const data: any = { version: db.verno };
    for (const { jsonKey, table } of DB_TABLE_REGISTRY) {
      data[jsonKey] = await (db as any)[table].toArray();
    }
    return data as InitializationData;
  } catch (error) {
    logError("Failed to export data from IndexedDB:", { error });
    throw error;
  }
}

export function setupDriveSync(isDemoMode = false): void {
  if (isDemoMode) {
    logInfo("Demo mode enabled, skipping Drive sync setup");
    return;
  }

  // Function to handle changes
  const handleChange = () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    // Debounce sync to avoid too many updates
    syncTimeout = setTimeout(() => {
      syncToDrive().catch(logError);
    }, 1000); // Wait 1 second after last change before syncing
  };

  // Subscribe to changes on all tables
  db.tables.forEach((table) => {
    table.hook("creating", handleChange);
    table.hook("updating", handleChange);
    table.hook("deleting", handleChange);
  });
}

export async function syncToDrive(): Promise<void> {
  if (syncInProgress) {
    logInfo("Sync already in progress, skipping...");
    return;
  }

  try {
    syncInProgress = true;
    const data = await exportDataFromIndexedDB();
    await uploadJsonFile(data, DATA_FILE_NAME);
    logInfo("Successfully synced to Drive");
  } catch (error) {
    logError("Failed to sync to Drive:", { error });
    throw error;
  } finally {
    syncInProgress = false;
  }
}

export function stopDriveSync(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  db.tables.forEach((table) => {
    table.hook("creating").unsubscribe(syncToDrive);
    table.hook("updating").unsubscribe(syncToDrive);
    table.hook("deleting").unsubscribe(syncToDrive);
  });
}
