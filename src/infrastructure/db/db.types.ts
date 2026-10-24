export interface BaseRecord {
  id: number;
}

export interface Config extends BaseRecord {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
}

export interface AssetPurpose extends BaseRecord {
  name: string;
  type: string;
}

export interface LoanType extends BaseRecord {
  name: string;
  type: string;
  interestRate: number;
}

export interface Holder extends BaseRecord {
  name: string;
  relationship?: string;
  externalKeys?: string[];
}

export interface SipType extends BaseRecord {
  name: string;
}

export interface Bucket extends BaseRecord {
  name: string;
}

export interface AssetClass extends BaseRecord {
  name: string;
}

export interface AssetSubClass extends BaseRecord {
  assetClasses_id: number;
  name: string;
  expectedReturns: number;
}

export interface Goal extends BaseRecord {
  name: string;
  priority: number;
  amountRequiredToday: number;
  durationInYears: number;
  assetPurpose_id: number;
}

export interface Account extends BaseRecord {
  bank: string;
  accountNumber: string;
  holders_id: number;
  lastFourDigits?: string;
  balance?: number;
}

export interface Income extends BaseRecord {
  item: string;
  accounts_id: number;
  holders_id: number;
  monthly: string;
}

export interface CashFlow extends BaseRecord {
  item: string;
  accounts_id: number;
  holders_id: number;
  monthly: number;
  yearly: number;
  assetPurpose_id: number;
  goal_id?: number | null; // Optional, links to Goal if present
  income_id?: number | null; // Optional, links to Income if present
  fromAccountId?: number | null; // Optional, links to from account for transfer
}

export interface AssetHolding extends BaseRecord {
  assetClasses_id: number;
  assetSubClasses_id: number;
  goals_id: number | null;
  holders_id: number;
  assetDetail: string;
  existingAllocation: number;
  sip: number;
  sipTypes_id: number;
  buckets_id: number;
  comments: string;
  // Units / Scheme tracking
  units?: number;
  schemeCode?: string;
  // External Sync Primitives (v13)
  externalId?: string;
  externalSource?: "INDMONEY" | "ZERODHA" | "CAMS" | "MANUAL";
  investedAmount?: number;
  nav?: number;
  lastSyncedAt?: string;
  isin?: string;
  // Market Link Fields
  grams?: number; // For Gold
  marketType?: "GOLD" | "NONE";
  goldPurity?: "22K" | "24K"; // For Gold purity
}

export interface Liability extends BaseRecord {
  loanType_id: number;
  loanAmount: number;
  loanStartDate: string; // Format: DD-MM-YYYY
  totalMonths: number;
}

export interface AssetProjection extends BaseRecord {
  assetSubClasses_id: number;
  newMonthlyInvestment: number;
  lumpsumExpected: number;
  redemptionExpected: number;
  comment: string;
}

export interface LiabilityProjection extends BaseRecord {
  liability_id?: number; // Optional: null for future loans
  loanType_id?: number; // Required for future loans
  loanAmount?: number; // Required for future loans (initial balance)
  startDate?: string; // Required for future loans (DD-MM-YYYY format)
  totalMonths?: number; // Required for future loans
  prepaymentExpected: number;
  comment: string;
}


export interface InsuranceType extends BaseRecord {
  name: string;
}

export interface Insurance extends BaseRecord {
  holders_id: number;
  insuranceType_id: number;
  premiumYearly: number;
  sumAssured: number;
  startDate: string; // Format: DD-MM-YYYY
  endDate: string;   // Format: DD-MM-YYYY
  renewDate: string; // Format: DD-MM-YYYY
  description: string;
}

export interface UpcomingExpense extends BaseRecord {
  title: string;
  description: string;
  dueDate: string; // Format: DD-MM-YYYY
  assetPurpose_id: number;
  amount: number;
  isCompleted: boolean;
  notes: string;
}

export interface InitializationData {
  version?: number;
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
  liabilitiesProjection: LiabilityProjection[];
  upcomingExpenses: UpcomingExpense[];
  insuranceTypes: InsuranceType[];
  insurances: Insurance[];
}

export const CURRENT_DB_VERSION = 13;
