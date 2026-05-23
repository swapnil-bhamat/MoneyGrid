import { logError, logInfo } from "@/services/logger";
import { db, sanitizeData } from "@/infrastructure/db/db";
import type { InitializationData } from "@/infrastructure/db/db";
import { findFile, readFile, uploadJsonFile } from "./googleDrive";

const DATA_FILE_NAME = "data.json";
let syncInProgress = false;
// Track the last successful sync timestamp
let syncTimeout: NodeJS.Timeout | null = null;

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

      // Create initial data in Google Drive
      logInfo("Uploading initial data to Google Drive...");
      await uploadJsonFile(initialData, DATA_FILE_NAME);
      logInfo(
        "Successfully uploaded to Google Drive, now importing to IndexedDB..."
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

async function importDataToIndexedDB(data: InitializationData): Promise<void> {
  try {
    logInfo("Starting data import to IndexedDB with data:", data);
    
    // Sanitize data before importing
    const sanitizedData = sanitizeData(data);
    
    await db.transaction("rw", db.tables, async () => {
      // Clear existing data
      logInfo("Clearing existing data from tables...");
      await Promise.all(db.tables.map((table) => table.clear()));
      logInfo("Tables cleared successfully");

      // Import new data
      logInfo("Beginning data import...");
      if (sanitizedData.configs?.length) await db.configs.bulkAdd(sanitizedData.configs);
      if (sanitizedData.assetPurpose?.length)
        await db.assetPurposes.bulkAdd(sanitizedData.assetPurpose);
      if (sanitizedData.loanType?.length) await db.loanTypes.bulkAdd(sanitizedData.loanType);
      if (sanitizedData.holders?.length) await db.holders.bulkAdd(sanitizedData.holders);
      if (sanitizedData.sipTypes?.length) await db.sipTypes.bulkAdd(sanitizedData.sipTypes);
      if (sanitizedData.buckets?.length) await db.buckets.bulkAdd(sanitizedData.buckets);
      if (sanitizedData.assetClasses?.length)
        await db.assetClasses.bulkAdd(sanitizedData.assetClasses);
      if (sanitizedData.assetSubClasses?.length)
        await db.assetSubClasses.bulkAdd(sanitizedData.assetSubClasses);
      if (sanitizedData.goals?.length) await db.goals.bulkAdd(sanitizedData.goals);
      if (sanitizedData.accounts?.length) await db.accounts.bulkAdd(sanitizedData.accounts);
      if (sanitizedData.income?.length) await db.income.bulkAdd(sanitizedData.income);
      if (sanitizedData.cashFlow?.length) await db.cashFlow.bulkAdd(sanitizedData.cashFlow);
      if (sanitizedData.assetsHoldings?.length)
        await db.assetsHoldings.bulkAdd(sanitizedData.assetsHoldings);
      if (sanitizedData.liabilities?.length)
        await db.liabilities.bulkAdd(sanitizedData.liabilities);
      if (sanitizedData.assetsProjection?.length)
        await db.assetsProjection.bulkAdd(sanitizedData.assetsProjection);
      if (sanitizedData.liabilitiesProjection?.length)
        await db.liabilitiesProjection.bulkAdd(sanitizedData.liabilitiesProjection);
      if (sanitizedData.upcomingExpenses?.length)
        await db.upcomingExpenses.bulkAdd(sanitizedData.upcomingExpenses);
      if (sanitizedData.insuranceTypes?.length)
        await db.insuranceTypes.bulkAdd(sanitizedData.insuranceTypes);
      if (sanitizedData.insurances?.length)
        await db.insurances.bulkAdd(sanitizedData.insurances);
    });
    logInfo("Successfully imported data to IndexedDB");
  } catch (error) {
    logError("Failed to import data to IndexedDB:", { error });
    throw error;
  }
}

export async function exportDataFromIndexedDB(): Promise<InitializationData> {
  try {
    return {
      version: db.verno,
      configs: await db.configs.toArray(),
      assetPurpose: await db.assetPurposes.toArray(),
      loanType: await db.loanTypes.toArray(),
      holders: await db.holders.toArray(),
      sipTypes: await db.sipTypes.toArray(),
      buckets: await db.buckets.toArray(),
      assetClasses: await db.assetClasses.toArray(),
      assetSubClasses: await db.assetSubClasses.toArray(),
      goals: await db.goals.toArray(),
      accounts: await db.accounts.toArray(),
      income: await db.income.toArray(),
      cashFlow: await db.cashFlow.toArray(),
      assetsHoldings: await db.assetsHoldings.toArray(),
      liabilities: await db.liabilities.toArray(),
      assetsProjection: await db.assetsProjection.toArray(),
      liabilitiesProjection: await db.liabilitiesProjection.toArray(),
      upcomingExpenses: await db.upcomingExpenses.toArray(),
      insuranceTypes: await db.insuranceTypes.toArray(),
      insurances: await db.insurances.toArray(),
    };
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
