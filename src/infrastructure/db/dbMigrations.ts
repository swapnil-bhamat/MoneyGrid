import Dexie, { Transaction } from "dexie";
import { logInfo } from "@/services/logger";

export const CURRENT_DB_VERSION = 13;

/**
 * Pure migration transformers shared between Dexie live upgrades and JSON backup sanitization (DRY).
 */
export function transformLiabilityV8(record: any) {
  const transformed = { ...record };
  if (transformed.loanTakenDate && !transformed.loanStartDate) {
    transformed.loanStartDate = transformed.loanTakenDate;
  }
  if (!transformed.loanStartDate) {
    const today = new Date();
    transformed.loanStartDate = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
  }
  if (!transformed.totalMonths) {
    transformed.totalMonths = 120; // Default to 10 years
  }
  delete transformed.balance;
  delete transformed.emi;
  delete transformed.loanTakenDate;
  return transformed;
}

export function transformLiabilityProjectionV8(record: any) {
  const transformed = { ...record };
  delete transformed.newEmi;
  if (!transformed.liability_id) {
    if (!transformed.startDate) {
      const today = new Date();
      transformed.startDate = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    }
    if (!transformed.totalMonths) {
      transformed.totalMonths = 120;
    }
  }
  return transformed;
}

export function transformAssetSubClassV8(record: any) {
  const transformed = { ...record };
  if (transformed.expectedReturns === undefined) {
    transformed.expectedReturns = 12; // Default to 12%
  }
  return transformed;
}

export function transformHolderV13(record: any) {
  const transformed = { ...record };
  if (!transformed.externalKeys && transformed.name) {
    transformed.externalKeys = [transformed.name.toLowerCase().trim()];
  }
  return transformed;
}

// Base schema shared across early versions
const BASE_SCHEMA = {
  configs: "++id",
  assetPurposes: "++id",
  loanTypes: "++id",
  holders: "++id",
  sipTypes: "++id",
  buckets: "++id",
  assetClasses: "++id",
  assetSubClasses: "++id, assetClasses_id",
  goals: "++id, assetPurpose_id",
  income: "++id, accounts_id, holders_id",
  cashFlow: "++id, accounts_id, holders_id, assetPurpose_id, goal_id",
  accounts: "++id, holders_id",
  assetsHoldings:
    "++id, assetClasses_id, assetSubClasses_id, goals_id, holders_id, buckets_id",
  liabilities: "++id, loanType_id",
  assetsProjection: "++id, assetSubClasses_id",
  liabilitiesProjection: "++id, liability_id, loanType_id",
};

export function defineSchema(db: Dexie) {
  // Version 1 (Base)
  db.version(1).stores(BASE_SCHEMA);

  // Version 7 (Previous base)
  db.version(7).stores(BASE_SCHEMA);

  // Version 8 - Schema changes for Liabilities
  db.version(8)
    .stores(BASE_SCHEMA)
    .upgrade(async (tx: Transaction) => {
      await tx.table("liabilities").toCollection().modify(transformLiabilityV8);
      await tx.table("liabilitiesProjection").toCollection().modify(transformLiabilityProjectionV8);
      await tx.table("assetSubClasses").toCollection().modify(transformAssetSubClassV8);
      logInfo("Database upgraded to version 8");
    });

  // Version 9 - Added Upcoming Expenses
  db.version(9).stores({
    ...BASE_SCHEMA,
    upcomingExpenses: "++id, assetPurpose_id",
  });

  // Version 10 - Added Insurances
  db.version(10).stores({
    ...BASE_SCHEMA,
    upcomingExpenses: "++id, assetPurpose_id",
    insuranceTypes: "++id",
    insurances: "++id, holders_id, insuranceType_id",
  });

  // Version 11 - Added income_id to CashFlow
  db.version(11).stores({
    ...BASE_SCHEMA,
    upcomingExpenses: "++id, assetPurpose_id",
    insuranceTypes: "++id",
    insurances: "++id, holders_id, insuranceType_id",
    cashFlow: "++id, accounts_id, holders_id, assetPurpose_id, goal_id, income_id",
  });

  // Version 12 - Added fromAccountId to CashFlow
  db.version(12).stores({
    ...BASE_SCHEMA,
    upcomingExpenses: "++id, assetPurpose_id",
    insuranceTypes: "++id",
    insurances: "++id, holders_id, insuranceType_id",
    cashFlow: "++id, accounts_id, holders_id, assetPurpose_id, goal_id, income_id, fromAccountId",
  });

  // Version 13 (Current) - External Sync Primitives & Multi-Source Reconciliation
  db.version(CURRENT_DB_VERSION)
    .stores({
      ...BASE_SCHEMA,
      holders: "++id, *externalKeys",
      cashFlow: "++id, accounts_id, holders_id, assetPurpose_id, goal_id, income_id, fromAccountId",
      assetsHoldings:
        "++id, assetClasses_id, assetSubClasses_id, goals_id, holders_id, buckets_id, externalId",
      upcomingExpenses: "++id, assetPurpose_id",
      insuranceTypes: "++id",
      insurances: "++id, holders_id, insuranceType_id",
    })
    .upgrade(async (tx: Transaction) => {
      logInfo("Upgrading to Database Schema v13 (External Sync Primitives)");
      await tx.table("holders").toCollection().modify(transformHolderV13);
    });
}
