export interface INDMoneyMeta {
  source?: string;
  fetched_on?: string;
  currency?: string;
  amount_unit?: string;
  note?: string;
}

export interface INDMoneyFamilyMember {
  key: string;
  name: string;
  relation_to_user?: string;
  indmoney_relation_label?: string;
  is_family_head?: boolean;
  sharing_portfolio?: boolean;
}

export interface INDMoneyFamilySummary {
  total_invested?: number;
  total_current_value?: number;
  total_return?: number;
  total_return_percentage?: number;
  total_liabilities?: number;
  net_worth?: number;
  one_day_change?: number;
}

export interface INDMoneyHoldingItem {
  scheme_id?: string;
  investment_code?: string;
  name?: string;
  scheme_name?: string;
  asset_class?: string;
  invested_amount?: number;
  invested?: number;
  current_value?: number;
  market_value?: number;
  quantity?: number;
  units?: number;
  unit_price?: number;
  nav?: number;
  total_pnl?: number;
  pnl_percentage?: number;
  holding_percentage?: number;
  holding_percent?: number;
  one_day_change?: number;
  one_day_change_percentage?: number;
  broker?: string;
  market_cap?: string;
}

export interface INDMoneyLoan {
  lender?: string;
  loan_type?: string;
  current_balance?: number;
}

export interface INDMoneyCreditCard {
  name?: string;
  card_variant?: string;
  total_due?: number;
  due_date?: string;
}

export interface INDMoneyBill {
  name?: string;
  amount?: number;
  type?: string;
}

export interface INDMoneyMemberLiabilities {
  total_loan_balance?: number;
  total_credit_card_due?: number;
  total?: number;
  loans?: INDMoneyLoan[];
  credit_cards?: INDMoneyCreditCard[];
  bills?: INDMoneyBill[];
}

export interface INDMoneyAssetGroup {
  total_value?: number;
  invested?: number;
  holdings?: INDMoneyHoldingItem[];
  note?: string;
}

export interface INDMoneyMemberAssets {
  real_estate?: INDMoneyAssetGroup;
  gold?: INDMoneyAssetGroup;
  mutual_fund?: INDMoneyAssetGroup;
  epf?: INDMoneyAssetGroup;
  nps?: INDMoneyAssetGroup;
  fixed_deposit?: INDMoneyAssetGroup;
  savings_account?: INDMoneyAssetGroup;
  indian_stock?: INDMoneyAssetGroup;
  us_stock?: INDMoneyAssetGroup;
  crypto?: INDMoneyAssetGroup;
}

export interface INDMoneyMember {
  totals?: {
    invested?: number;
    current_value?: number;
    net_worth?: number;
    one_day_change?: number;
  };
  assets?: INDMoneyMemberAssets;
  liabilities?: INDMoneyMemberLiabilities;
}

export interface INDMoneyPayload {
  meta?: INDMoneyMeta;
  family?: {
    members?: INDMoneyFamilyMember[];
    summary?: INDMoneyFamilySummary;
  };
  members?: Record<string, INDMoneyMember>;
  data_notes?: string[];
}

export type ReconciliationCategory =
  | "mutual_fund"
  | "retirement"
  | "fixed_deposit"
  | "savings_account"
  | "stock"
  | "gold"
  | "real_estate"
  | "liability"
  | "other";

export type ReconciliationStatus = "update" | "new" | "unchanged" | "app_only";

export interface ReconciliationItem {
  id: string; // Unique row ID for UI
  holdingId?: number; // DB ID in db.assetsHoldings if matched
  holderId: number; // DB ID in db.holders
  holderName: string;
  assetName: string;
  category: ReconciliationCategory;
  categoryLabel: string;
  oldValue: number;
  newValue: number;
  delta: number;
  oldUnits?: number;
  newUnits?: number;
  schemeCode?: string;
  externalId?: string;
  investedAmount?: number;
  nav?: number;
  assetSubClasses_id?: number;
  assetClasses_id?: number;
  status: ReconciliationStatus;
  selected: boolean;
  notes?: string;
}

export interface DetectedMember {
  key: string;
  name: string;
  resolvedHolderId: number;
}

export interface ReconciliationResult {
  items: ReconciliationItem[];
  detectedMembers: DetectedMember[];
  summary: {
    totalExisting: number;
    totalUpdated: number;
    totalDelta: number;
    updateCount: number;
    newCount: number;
    unchangedCount: number;
    appOnlyCount: number;
  };
  fetchedOn?: string;
}

