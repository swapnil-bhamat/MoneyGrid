import { db } from "@/infrastructure/db/db";
import type {
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
  InsuranceType,
  Insurance,
} from "@/infrastructure/db/db";
import { logError, logInfo } from "@/services/logger";

interface DemoData {
  configs: Config[];
  assetPurpose: AssetPurpose[];
  loanType: LoanType[];
  holders: Holder[];
  sipTypes: SipType[];
  buckets: Bucket[];
  assetClasses: AssetClass[];
  assetSubClasses: AssetSubClass[];
  goals: Goal[];
  accounts: Account[];
  income: Income[];
  cashFlow: CashFlow[];
  assetsHoldings: AssetHolding[];
  liabilities: Liability[];
  assetsProjection: AssetProjection[];
  insuranceTypes: InsuranceType[];
  insurances: Insurance[];
}

export const clearExistingData = async () => {
  // Clear existing data
  logInfo("Clearing existing data...");
  await Promise.all([
    db.configs.clear(),
    db.assetPurposes.clear(),
    db.loanTypes.clear(),
    db.holders.clear(),
    db.sipTypes.clear(),
    db.buckets.clear(),
    db.assetClasses.clear(),
    db.assetSubClasses.clear(),
    db.goals.clear(),
    db.accounts.clear(),
    db.income.clear(),
    db.cashFlow.clear(),
    db.assetsHoldings.clear(),
    db.liabilities.clear(),
    db.assetsProjection.clear(),
    db.insuranceTypes.clear(),
    db.insurances.clear(),
  ]);
};

export const initializeDemoData = async () => {
  try {
    await clearExistingData();

    logInfo("Loading demo data...");
    // Fetch demo data from the public JSON file
    const response = await fetch("./data.json");
    if (!response.ok) {
      throw new Error("Failed to load demo data");
    }

    const data: DemoData = await response.json();
    logInfo("Demo data loaded:", data);

    logInfo("Loading new data...");
    // Load demo data into IndexedDB
    await Promise.all([
      db.configs.bulkAdd(data.configs || []),
      db.assetPurposes.bulkAdd(data.assetPurpose || []),
      db.loanTypes.bulkAdd(data.loanType || []),
      db.holders.bulkAdd(data.holders || []),
      db.sipTypes.bulkAdd(data.sipTypes || []),
      db.buckets.bulkAdd(data.buckets || []),
      db.assetClasses.bulkAdd(data.assetClasses || []),
      db.assetSubClasses.bulkAdd(data.assetSubClasses || []),
      db.goals.bulkAdd(data.goals || []),
      db.accounts.bulkAdd(data.accounts || []),
      db.income.bulkAdd(data.income || []),
      db.cashFlow.bulkAdd(data.cashFlow || []),
      db.assetsHoldings.bulkAdd(data.assetsHoldings || []),
      db.liabilities.bulkAdd(data.liabilities || []),
      db.assetsProjection.bulkAdd(data.assetsProjection || []),
      db.insuranceTypes.bulkAdd(data.insuranceTypes || []),
      db.insurances.bulkAdd(data.insurances || []),
    ]);

    return true;
  } catch (error) {
    logError("Failed to initialize demo data:", { error });
    throw error;
  }
};
