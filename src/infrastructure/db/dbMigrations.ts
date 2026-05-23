import Dexie, { Transaction } from "dexie";
import { logInfo } from "@/services/logger";

export const CURRENT_DB_VERSION = 12;

export function defineSchema(db: Dexie) {
  // Define schema for version 1 (Base)
  db.version(1).stores({
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
  });

  // Version 7 (Previous)
  db.version(7).stores({
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
  });

  // Version 8 (Previous) - Schema changes for Liabilities
  db.version(8)
    .stores({
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
    })
    .upgrade(async (tx: Transaction) => {
      // Migrate Liabilities
      await tx.table("liabilities").toCollection().modify((record: any) => {
        // Rename loanTakenDate -> loanStartDate
        if (record.loanTakenDate && !record.loanStartDate) {
          record.loanStartDate = record.loanTakenDate;
        }
        // Default loanStartDate if missing
        if (!record.loanStartDate) {
          const today = new Date();
          record.loanStartDate = `${String(today.getDate()).padStart(
            2,
            "0"
          )}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
        }
        // Default totalMonths if missing
        if (!record.totalMonths) {
          record.totalMonths = 120; // Default to 10 years
        }

        // Remove old fields
        delete record.balance;
        delete record.emi;
        delete record.loanTakenDate;
      });

      // Migrate LiabilityProjections
      await tx
        .table("liabilitiesProjection")
        .toCollection()
        .modify((record: any) => {
          // Remove newEmi
          delete record.newEmi;

          // Ensure future loans have required fields
          if (!record.liability_id) {
            if (!record.startDate) {
              const today = new Date();
              record.startDate = `${String(today.getDate()).padStart(
                2,
                "0"
              )}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
            }
            if (!record.totalMonths) {
              record.totalMonths = 120;
            }
          }
        });

      // Migrate AssetSubClasses
      await tx.table("assetSubClasses").toCollection().modify((record: any) => {
        if (record.expectedReturns === undefined) {
          record.expectedReturns = 12; // Default to 12%
        }
      });

      logInfo(`Database upgraded to version 8`);
    });

  // Version 9 (Previous) - Added Upcoming Expenses
  db.version(9).stores({
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
    upcomingExpenses: "++id, assetPurpose_id",
  });

  // Version 10 (Previous) - Added Insurances
  db.version(10).stores({
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
    upcomingExpenses: "++id, assetPurpose_id",
    insuranceTypes: "++id",
    insurances: "++id, holders_id, insuranceType_id",
  });

  // Version 11 (Previous) - Added income_id to CashFlow
  db.version(11).stores({
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
    cashFlow: "++id, accounts_id, holders_id, assetPurpose_id, goal_id, income_id",
    accounts: "++id, holders_id",
    assetsHoldings:
      "++id, assetClasses_id, assetSubClasses_id, goals_id, holders_id, buckets_id",
    liabilities: "++id, loanType_id",
    assetsProjection: "++id, assetSubClasses_id",
    liabilitiesProjection: "++id, liability_id, loanType_id",
    upcomingExpenses: "++id, assetPurpose_id",
    insuranceTypes: "++id",
    insurances: "++id, holders_id, insuranceType_id",
  });

  // Version 12 (Current) - Added fromAccountId and toAccountId to CashFlow
  db.version(CURRENT_DB_VERSION).stores({
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
    cashFlow: "++id, accounts_id, holders_id, assetPurpose_id, goal_id, income_id, fromAccountId",
    accounts: "++id, holders_id",
    assetsHoldings:
      "++id, assetClasses_id, assetSubClasses_id, goals_id, holders_id, buckets_id",
    liabilities: "++id, loanType_id",
    assetsProjection: "++id, assetSubClasses_id",
    liabilitiesProjection: "++id, liability_id, loanType_id",
    upcomingExpenses: "++id, assetPurpose_id",
    insuranceTypes: "++id",
    insurances: "++id, holders_id, insuranceType_id",
  });
}
