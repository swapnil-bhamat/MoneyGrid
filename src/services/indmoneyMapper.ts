import {
  INDMoneyPayload,
  INDMoneyHoldingItem,
  INDMoneyAssetGroup,
  ReconciliationItem,
  ReconciliationResult,
  ReconciliationCategory,
  DetectedMember,
} from "@/types/indmoney.types";
import {
  AssetHolding,
  Holder,
  AssetSubClass,
  Liability,
  LoanType,
} from "@/infrastructure/db/db.types";
import { db } from "@/infrastructure/db/db";

/**
 * Normalizes text for direct, predictable 1:1 matching
 */
export function normalizeName(name?: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[-–—/\\(),.&]/g, " ")
    .replace(/\bmidcap\b/gi, "mid cap")
    .replace(/\bflexicap\b/gi, "flexi cap")
    .replace(/\blargecap\b/gi, "large cap")
    .replace(/\bsmallcap\b/gi, "small cap")
    .replace(/\b(fund|direct|growth|plan|option|regular|equity|debt|ltd|limited|the)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts raw JSON from pasted text (handles Markdown code blocks)
 */
export function parseINDMoneyPayload(rawText: string): INDMoneyPayload {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
  }
  const parsed = JSON.parse(cleaned);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid JSON: Root must be an object.");
  }

  if (!parsed.members && !parsed.family) {
    throw new Error("Invalid INDmoney format: Expected 'members' or 'family' object.");
  }

  return parsed as INDMoneyPayload;
}

/**
 * Resolves INDmoney member key or name to a local database Holder
 */
export function resolveHolderId(
  memberKey: string,
  memberName: string | undefined,
  holders: Holder[],
  customMap?: Record<string, number>,
  relation?: string,
  memberIndex?: number
): { id: number; name: string } {
  // 1. User manual override from UI
  if (customMap && customMap[memberKey] !== undefined) {
    const mapped = holders.find((h) => h.id === customMap[memberKey]);
    if (mapped) return { id: mapped.id, name: mapped.name };
  }

  const normKey = normalizeName(memberKey);
  const normName = normalizeName(memberName);
  const normRel = normalizeName(relation);

  // 2. Direct name or externalKeys alias match
  for (const h of holders) {
    const hNorm = normalizeName(h.name);
    const aliases = (h.externalKeys || []).map((k) => normalizeName(k));
    if (
      aliases.includes(normKey) ||
      aliases.includes(normName) ||
      (hNorm && (normKey === hNorm || normName === hNorm || normName.includes(hNorm) || hNorm.includes(normName)))
    ) {
      return { id: h.id, name: h.name };
    }
  }

  // 3. Common relationship mapping
  if (normRel.includes("spouse") || normRel.includes("wife") || normRel.includes("husband")) {
    if (holders[1]) return { id: holders[1].id, name: holders[1].name };
  }
  if (normRel.includes("self") || normRel.includes("head")) {
    if (holders[0]) return { id: holders[0].id, name: holders[0].name };
  }

  // 4. Positional fallback (index 0 -> holder 0, index 1 -> holder 1)
  if (memberIndex !== undefined && holders[memberIndex]) {
    return { id: holders[memberIndex].id, name: holders[memberIndex].name };
  }

  return holders[0] ? { id: holders[0].id, name: holders[0].name } : { id: 1, name: "Primary Holder" };
}

/**
 * Direct 1:1 holding match (Scheme Code or clean name match)
 */
function findBestHoldingMatch(
  indHolding: INDMoneyHoldingItem,
  holderId: number,
  availableHoldings: AssetHolding[]
): AssetHolding | undefined {
  const indName = indHolding.name || indHolding.scheme_name || "";
  const normIndName = normalizeName(indName);
  const indSchemeId = String(indHolding.scheme_id || "").trim();

  const holderCandidates = availableHoldings.filter((h) => h.holders_id === holderId);

  // 1. Scheme code or externalId match
  if (indSchemeId) {
    const codeMatch = holderCandidates.find(
      (h) =>
        (h.schemeCode && String(h.schemeCode).trim() === indSchemeId) ||
        (h.externalId && String(h.externalId).trim() === indSchemeId)
    );
    if (codeMatch) return codeMatch;
  }

  // 2. Direct name match
  if (normIndName) {
    const directMatch = holderCandidates.find((h) => {
      const hNorm = normalizeName(h.assetDetail);
      return (
        hNorm === normIndName ||
        hNorm.includes(normIndName) ||
        normIndName.includes(hNorm) ||
        (normIndName.includes("corporate bond") &&
          (hNorm.includes("debt bucket") || (h.comments && normalizeName(h.comments).includes("corporate bond"))))
      );
    });
    if (directMatch) return directMatch;
  }

  // 3. Cross-holder fallback for family assets (Gold / Real Estate) where INDmoney tracks under primary account
  if (normIndName && (normIndName.includes("gold") || normIndName.includes("bar") || normIndName.includes("jewel"))) {
    const crossMatch = availableHoldings.find((h) => {
      const hNorm = normalizeName(h.assetDetail);
      return (
        (h.assetClasses_id === 4 || hNorm.includes("gold")) &&
        (hNorm === normIndName || hNorm.includes(normIndName) || normIndName.includes(hNorm))
      );
    });
    if (crossMatch) return crossMatch;
  }

  return undefined;
}

/**
 * Direct 1:1 liability match by lender name or loan type
 */
function findLiabilityMatch(
  indLender: string,
  indLoanType: string,
  availableLiabilities: Liability[],
  loanTypes: LoanType[]
): Liability | undefined {
  const normLender = normalizeName(indLender);
  const normType = normalizeName(indLoanType);

  // Find loanType by keyword (e.g. "HOUSING LOAN" -> Home Loan, "PROPERTY LOAN" -> Home Loan Insurance)
  const matchedLoanType = loanTypes.find((lt) => {
    const ltNorm = normalizeName(lt.name);
    if (normType.includes("housing") || normType.includes("home")) {
      return ltNorm.includes("home") && !ltNorm.includes("insurance");
    }
    if (normType.includes("property")) {
      return ltNorm.includes("insurance") || ltNorm.includes("property");
    }
    if (normType.includes("car")) {
      return ltNorm.includes("car");
    }
    return ltNorm.includes(normType) || normType.includes(ltNorm);
  });

  // Priority 1: Match by loanType_id
  let matchedLiab = matchedLoanType
    ? availableLiabilities.find((l) => l.loanType_id === matchedLoanType.id)
    : undefined;

  // Priority 2: Fallback to lender name if not matched by loan type
  if (!matchedLiab && normLender) {
    matchedLiab = availableLiabilities.find(
      (l) => l.lender && (normalizeName(l.lender).includes(normLender) || normLender.includes(normalizeName(l.lender)))
    );
  }

  return matchedLiab;
}

/**
 * Helper to process an array of holdings for a given category
 */
function processHoldingList(
  holdingsList: INDMoneyHoldingItem[],
  holderInfo: { id: number; name: string },
  category: ReconciliationCategory,
  categoryLabel: string,
  defaultAssetClassId: number,
  defaultSubClassId: number,
  currentHoldings: AssetHolding[],
  matchedHoldingIds: Set<number>,
  outItems: ReconciliationItem[],
  nextSeq: () => number
) {
  for (const item of holdingsList) {
    const val = item.current_value ?? item.market_value ?? 0;
    const invested = item.invested_amount ?? item.invested;
    const units = item.quantity ?? item.units;
    const nav = item.unit_price ?? item.nav;
    const name = item.name || item.scheme_name || categoryLabel;
    const extId = item.scheme_id ? String(item.scheme_id) : item.investment_code;

    const matched = findBestHoldingMatch(item, holderInfo.id, currentHoldings);
    if (matched) {
      matchedHoldingIds.add(matched.id);
      const oldVal = matched.existingAllocation || 0;
      const delta = Number((val - oldVal).toFixed(2));
      const isChanged = Math.abs(delta) > 0.01;
      outItems.push({
        id: `holding-${matched.id}-${nextSeq()}`,
        holdingId: matched.id,
        holderId: holderInfo.id,
        holderName: holderInfo.name,
        assetName: matched.assetDetail,
        category,
        categoryLabel,
        oldValue: oldVal,
        newValue: val,
        delta,
        oldUnits: matched.units,
        newUnits: units,
        schemeCode: item.scheme_id || matched.schemeCode,
        externalId: extId || matched.externalId,
        investedAmount: invested !== undefined ? invested : matched.investedAmount,
        nav: nav !== undefined ? nav : matched.nav,
        status: isChanged ? "update" : "unchanged",
        selected: isChanged,
      });
    } else {
      outItems.push({
        id: `new-${nextSeq()}`,
        holderId: holderInfo.id,
        holderName: holderInfo.name,
        assetName: name,
        category,
        categoryLabel: `${categoryLabel} (New)`,
        oldValue: 0,
        newValue: val,
        delta: val,
        newUnits: units,
        schemeCode: item.scheme_id,
        externalId: extId,
        investedAmount: invested,
        nav,
        assetClasses_id: defaultAssetClassId,
        assetSubClasses_id: defaultSubClassId,
        status: "new",
        selected: true,
      });
    }
  }
}

/**
 * Helper to process an aggregate asset group (e.g. EPF, NPS, FD without separate holdings list)
 */
function processAssetGroup(
  group: INDMoneyAssetGroup | undefined,
  holderInfo: { id: number; name: string },
  category: ReconciliationCategory,
  categoryLabel: string,
  matchKeyword: string,
  defaultAssetClassId: number,
  defaultSubClassId: number,
  currentHoldings: AssetHolding[],
  matchedHoldingIds: Set<number>,
  outItems: ReconciliationItem[],
  nextSeq: () => number
) {
  if (!group) return;

  const val = group.total_value ?? group.invested ?? 0;

  // 1. Check if user already maintains a consolidated holding for this asset category (e.g. "EPF" or "SBI" FD)
  const consolidatedMatch = currentHoldings.find(
    (h) =>
      h.holders_id === holderInfo.id &&
      !matchedHoldingIds.has(h.id) &&
      (normalizeName(h.assetDetail) === normalizeName(categoryLabel) ||
        normalizeName(h.assetDetail) === matchKeyword ||
        normalizeName(h.assetDetail).includes(matchKeyword) ||
        (h.comments && normalizeName(h.comments).includes(matchKeyword)) ||
        (defaultSubClassId && h.assetSubClasses_id === defaultSubClassId))
  );

  // If a consolidated holding exists and aggregate value > 0, reconcile directly to it
  if (consolidatedMatch && val > 0) {
    matchedHoldingIds.add(consolidatedMatch.id);
    const delta = Number((val - consolidatedMatch.existingAllocation).toFixed(2));
    const isChanged = Math.abs(delta) > 0.01;
    const notes =
      group.holdings && group.holdings.length > 0
        ? `Includes ${group.holdings.length} sub-holdings: ${group.holdings
            .map((h) => h.name || "")
            .filter(Boolean)
            .join(", ")}`
        : undefined;

    outItems.push({
      id: `agg-${consolidatedMatch.id}-${nextSeq()}`,
      holdingId: consolidatedMatch.id,
      holderId: holderInfo.id,
      holderName: holderInfo.name,
      assetName: consolidatedMatch.assetDetail,
      category,
      categoryLabel,
      oldValue: consolidatedMatch.existingAllocation,
      newValue: val,
      delta,
      investedAmount:
        group.invested !== undefined ? group.invested : consolidatedMatch.investedAmount,
      status: isChanged ? "update" : "unchanged",
      selected: isChanged,
      notes,
    });
    return;
  }

  // 2. Otherwise, if individual holdings exist in the group, process them individually
  if (group.holdings && group.holdings.length > 0) {
    processHoldingList(
      group.holdings,
      holderInfo,
      category,
      categoryLabel,
      defaultAssetClassId,
      defaultSubClassId,
      currentHoldings,
      matchedHoldingIds,
      outItems,
      nextSeq
    );
    return;
  }

  // 3. Fallback: No individual holdings and no consolidated match -> create a new aggregate item
  if (val <= 0) return;
  outItems.push({
    id: `agg-new-${nextSeq()}`,
    holderId: holderInfo.id,
    holderName: holderInfo.name,
    assetName: categoryLabel,
    category,
    categoryLabel: `${categoryLabel} (New)`,
    oldValue: 0,
    newValue: val,
    delta: val,
    investedAmount: group.invested,
    assetClasses_id: defaultAssetClassId,
    assetSubClasses_id: defaultSubClassId,
    status: "new",
    selected: true,
  });
}

/**
 * Generates reconciliation diff between INDmoney payload and current database state
 */
export function generateReconciliationDiff(
  payload: INDMoneyPayload,
  currentHoldings: AssetHolding[],
  holders: Holder[],
  assetSubClasses: AssetSubClass[] = [],
  customHolderMap?: Record<string, number>,
  currentLiabilities: Liability[] = [],
  loanTypes: LoanType[] = []
): ReconciliationResult {
  const items: ReconciliationItem[] = [];
  const matchedHoldingIds = new Set<number>();
  const detectedMembers: DetectedMember[] = [];
  let rowSeq = 0;
  const nextSeq = () => rowSeq++;

  const membersObj = payload.members || {};

  // Resolve subclass IDs
  const stockSubClass = assetSubClasses.find((sc) => sc.name.toLowerCase().includes("stock"))?.id || 2;
  const equityMfSubClass = assetSubClasses.find((sc) => sc.name.toLowerCase().includes("equity mutual"))?.id || 1;
  const liquidSubClass = assetSubClasses.find((sc) => sc.name.toLowerCase().includes("sa balance"))?.id || 14;

  let memberIdx = 0;
  for (const [memberKey, memberData] of Object.entries(membersObj)) {
    const familyMemberMeta = payload.family?.members?.find((m) => m.key === memberKey);
    const memberName = familyMemberMeta?.name || memberKey;
    const relation = familyMemberMeta?.relation_to_user;

    const holderInfo = resolveHolderId(
      memberKey,
      memberName,
      holders,
      customHolderMap,
      relation,
      memberIdx++
    );

    detectedMembers.push({
      key: memberKey,
      name: memberName,
      resolvedHolderId: holderInfo.id,
    });

    const assets = memberData.assets;
    if (assets) {
      if (assets.mutual_fund?.holdings) {
        processHoldingList(
          assets.mutual_fund.holdings,
          holderInfo,
          "mutual_fund",
          "Mutual Fund",
          1,
          equityMfSubClass,
          currentHoldings,
          matchedHoldingIds,
          items,
          nextSeq
        );
      }

      processAssetGroup(
        assets.epf,
        holderInfo,
        "retirement",
        "EPF",
        "epf",
        2,
        6,
        currentHoldings,
        matchedHoldingIds,
        items,
        nextSeq
      );

      processAssetGroup(
        assets.nps,
        holderInfo,
        "retirement",
        "NPS",
        "nps",
        1,
        1,
        currentHoldings,
        matchedHoldingIds,
        items,
        nextSeq
      );

      processAssetGroup(
        assets.fixed_deposit,
        holderInfo,
        "fixed_deposit",
        "Fixed Deposit",
        "sbi",
        2,
        9,
        currentHoldings,
        matchedHoldingIds,
        items,
        nextSeq
      );

      if (assets.savings_account?.holdings) {
        processHoldingList(
          assets.savings_account.holdings,
          holderInfo,
          "savings_account",
          "Savings Account",
          3,
          liquidSubClass,
          currentHoldings,
          matchedHoldingIds,
          items,
          nextSeq
        );
      }

      if (assets.indian_stock?.holdings) {
        processHoldingList(
          assets.indian_stock.holdings,
          holderInfo,
          "stock",
          "Indian Stock",
          1,
          stockSubClass,
          currentHoldings,
          matchedHoldingIds,
          items,
          nextSeq
        );
      }

      if (assets.us_stock?.holdings) {
        processHoldingList(
          assets.us_stock.holdings,
          holderInfo,
          "stock",
          "US Stock",
          1,
          stockSubClass,
          currentHoldings,
          matchedHoldingIds,
          items,
          nextSeq
        );
      }

      if (assets.real_estate?.holdings) {
        processHoldingList(
          assets.real_estate.holdings,
          holderInfo,
          "real_estate",
          "Real Estate",
          5,
          22,
          currentHoldings,
          matchedHoldingIds,
          items,
          nextSeq
        );
      }

      // Gold
      if (assets.gold) {
        const hasGoldHoldings = Boolean(
          assets.gold.holdings && assets.gold.holdings.length > 0
        );
        const val = assets.gold.total_value ?? assets.gold.invested ?? 0;
        if (val > 0 || hasGoldHoldings) {
          if (assets.gold.holdings && assets.gold.holdings.length > 0) {
            // INDmoney provided row-level gold holdings -> match individually
            processHoldingList(
              assets.gold.holdings,
              holderInfo,
              "gold",
              "Gold",
              4,
              16,
              currentHoldings,
              matchedHoldingIds,
              items,
              nextSeq
            );
          } else {
            // INDmoney only provided an aggregate total without row-level breakdown.
            // If user has physical gold (grammage tracked or multiple jewellery pieces),
            // protect them as App-Only to prevent collapsing the entire total onto one item.
            const userGoldHoldings = currentHoldings.filter(
              (h) =>
                h.holders_id === holderInfo.id &&
                !matchedHoldingIds.has(h.id) &&
                (h.assetClasses_id === 4 || normalizeName(h.assetDetail).includes("gold"))
            );

            // Only reconcile aggregate if user maintains a single generic holding with no physical grammage
            if (userGoldHoldings.length === 1 && !userGoldHoldings[0].grams) {
              const matchedGold = userGoldHoldings[0];
              matchedHoldingIds.add(matchedGold.id);
              const delta = Number((val - matchedGold.existingAllocation).toFixed(2));
              const isChanged = Math.abs(delta) > 0.01;
              items.push({
                id: `gold-${matchedGold.id}-${nextSeq()}`,
                holdingId: matchedGold.id,
                holderId: holderInfo.id,
                holderName: holderInfo.name,
                assetName: matchedGold.assetDetail,
                category: "gold",
                categoryLabel: "Gold",
                oldValue: matchedGold.existingAllocation,
                newValue: val,
                delta,
                investedAmount:
                  assets.gold.invested !== undefined
                    ? assets.gold.invested
                    : matchedGold.investedAmount,
                status: isChanged ? "update" : "unchanged",
                selected: isChanged,
              });
            }
          }
        }
      }
    }

    // Liabilities (Loans & Credit Cards)
    const liabilities = memberData.liabilities;
    if (liabilities) {
      if (liabilities.loans && liabilities.loans.length > 0) {
        for (const loan of liabilities.loans) {
          const bal = loan.current_balance ?? 0;
          const lenderName = loan.lender || "Bank";
          const loanTypeStr = loan.loan_type || "Loan";
          const desc = `${lenderName} ${loanTypeStr}`.trim();

          const matchedLiab = findLiabilityMatch(
            lenderName,
            loanTypeStr,
            currentLiabilities,
            loanTypes
          );

          if (matchedLiab) {
            const oldVal = matchedLiab.outstandingBalance ?? matchedLiab.loanAmount ?? 0;
            const delta = Number((bal - oldVal).toFixed(2));
            const isChanged = Math.abs(delta) > 0.01;
            items.push({
              id: `liab-${matchedLiab.id}-${nextSeq()}`,
              liabilityId: matchedLiab.id,
              holderId: holderInfo.id,
              holderName: holderInfo.name,
              assetName: desc,
              category: "liability",
              categoryLabel: "Loan Liability",
              oldValue: oldVal,
              newValue: bal,
              delta,
              loanType_id: matchedLiab.loanType_id,
              liabilityType: "loan",
              status: isChanged ? "update" : "unchanged",
              selected: isChanged,
              notes: `Principal: ₹${matchedLiab.loanAmount.toLocaleString("en-IN")}${matchedLiab.lender ? ` · Lender: ${matchedLiab.lender}` : ` · (will set lender: ${lenderName})`}`,
            });
          }
        }
      }

      if (liabilities.credit_cards && liabilities.credit_cards.length > 0) {
        const creditCardLoanType = loanTypes.find(
          (lt) =>
            normalizeName(lt.name).includes("credit card") ||
            normalizeName(lt.type || "").includes("credit_card") ||
            normalizeName(lt.type || "").includes("creditcard")
        );

        for (const cc of liabilities.credit_cards) {
          const due = cc.total_due ?? 0;
          if (due > 0) {
            const ccName = cc.name || "Credit Card";
            const normCc = normalizeName(ccName);

            const matchedLiab = currentLiabilities.find(
              (l) =>
                (creditCardLoanType && l.loanType_id === creditCardLoanType.id) ||
                (l.lender && (normCc.includes(normalizeName(l.lender)) || normalizeName(l.lender).includes(normCc)))
            );

            if (matchedLiab) {
              const oldVal = matchedLiab.outstandingBalance ?? matchedLiab.loanAmount ?? 0;
              const delta = Number((due - oldVal).toFixed(2));
              items.push({
                id: `cc-${matchedLiab.id}-${nextSeq()}`,
                liabilityId: matchedLiab.id,
                holderId: holderInfo.id,
                holderName: holderInfo.name,
                assetName: ccName,
                category: "liability",
                categoryLabel: "Credit Card",
                oldValue: oldVal,
                newValue: due,
                delta,
                dueDate: cc.due_date,
                loanType_id: matchedLiab.loanType_id,
                liabilityType: "credit_card",
                status: Math.abs(delta) > 0.01 ? "update" : "unchanged",
                selected: Math.abs(delta) > 0.01,
                notes: `Due Date: ${cc.due_date || "N/A"}${matchedLiab.lender ? ` · Lender: ${matchedLiab.lender}` : ""}`,
              });
            } else if (creditCardLoanType) {
              items.push({
                id: `cc-new-${nextSeq()}`,
                holderId: holderInfo.id,
                holderName: holderInfo.name,
                assetName: ccName,
                category: "liability",
                categoryLabel: "Credit Card (New)",
                oldValue: 0,
                newValue: due,
                delta: due,
                dueDate: cc.due_date,
                loanType_id: creditCardLoanType.id,
                liabilityType: "credit_card",
                status: "new",
                selected: true,
                notes: `Due Date: ${cc.due_date || "N/A"}`,
              });
            }
          }
        }
      }
    }
  }

  // App-Only Holdings (Protected & Untouched)
  for (const holding of currentHoldings) {
    if (!matchedHoldingIds.has(holding.id)) {
      const holder = holders.find((h) => h.id === holding.holders_id);
      let catLabel = "Other Asset";
      if (holding.assetClasses_id === 4) catLabel = "Physical Gold";
      if (holding.assetSubClasses_id === 12) catLabel = "SSY Account";

      items.push({
        id: `app-only-${holding.id}-${nextSeq()}`,
        holdingId: holding.id,
        holderId: holding.holders_id,
        holderName: holder?.name || "Family",
        assetName: holding.assetDetail,
        category: "other",
        categoryLabel: catLabel,
        oldValue: holding.existingAllocation || 0,
        newValue: holding.existingAllocation || 0,
        delta: 0,
        oldUnits: holding.units,
        status: "app_only",
        selected: false,
        notes: holding.marketType === "GOLD" && holding.grams ? `${holding.grams}g (${holding.goldPurity || "24K"})` : undefined,
      });
    }
  }

  // Calculate summary metrics
  const updateItems = items.filter((i) => i.status === "update" && i.selected);
  const totalExisting = currentHoldings.reduce((sum, h) => sum + (h.existingAllocation || 0), 0);
  const totalDelta = updateItems.reduce((sum, i) => sum + i.delta, 0);
  const totalUpdated = totalExisting + totalDelta;

  return {
    items,
    detectedMembers,
    summary: {
      totalExisting,
      totalUpdated,
      totalDelta,
      updateCount: items.filter((i) => i.status === "update").length,
      newCount: items.filter((i) => i.status === "new").length,
      unchangedCount: items.filter((i) => i.status === "unchanged").length,
      appOnlyCount: items.filter((i) => i.status === "app_only").length,
    },
    fetchedOn: payload.meta?.fetched_on,
  };
}

/**
 * Safely executes reconciliation updates inside a single Dexie transaction.
 * Preserves all app planning metadata (goals_id, sip, buckets_id, comments, etc.).
 * Persists custom holder mappings to db.holders.externalKeys for permanent recall.
 */
export async function applyINDMoneyReconciliation(
  items: ReconciliationItem[],
  currentHoldings: AssetHolding[],
  customHolderMap?: Record<string, number>,
  currentLiabilities: Liability[] = []
): Promise<{ updatedCount: number; addedCount: number; updatedLiabilitiesCount: number }> {
  let updatedCount = 0;
  let addedCount = 0;
  let updatedLiabilitiesCount = 0;

  await db.transaction("rw", [db.assetsHoldings, db.holders, db.liabilities], async () => {
    // 1. If customHolderMap was provided, save aliases to db.holders so they are remembered permanently
    if (customHolderMap) {
      for (const [memberKey, holderId] of Object.entries(customHolderMap)) {
        if (!memberKey || !holderId) continue;
        const holder = await db.holders.get(holderId);
        if (holder) {
          const keys = new Set(holder.externalKeys || []);
          keys.add(memberKey.toLowerCase().trim());
          await db.holders.update(holderId, { externalKeys: Array.from(keys) });
        }
      }
    }

    const nowIso = new Date().toISOString();

    for (const item of items) {
      if (!item.selected) continue;

      if (item.category === "liability") {
        if (item.status === "update" && item.liabilityId) {
          const existing = currentLiabilities.find((l) => l.id === item.liabilityId);
          if (existing) {
            const updatePayload: Partial<Liability> = {
              outstandingBalance: item.newValue,
              dueDate: item.dueDate,
              lastSyncedAt: nowIso,
            };
            if (!existing.lender && item.assetName) {
              const bankWord = item.assetName.split(" ")[0];
              if (bankWord && bankWord !== "Bank") updatePayload.lender = bankWord;
            }
            await db.liabilities.update(item.liabilityId, updatePayload);
            updatedLiabilitiesCount++;
          }
        } else if (item.status === "new" && item.liabilityType === "credit_card" && item.loanType_id) {
          const today = new Date();
          const startDateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
          await db.liabilities.add({
            loanType_id: item.loanType_id,
            loanAmount: item.newValue,
            loanStartDate: startDateStr,
            totalMonths: 1, // Revolving credit card monthly balance
            outstandingBalance: item.newValue,
            dueDate: item.dueDate,
            lastSyncedAt: nowIso,
            lender: item.assetName,
          } as Liability);
          addedCount++;
        }
        continue;
      }

      if (item.status === "update" && item.holdingId) {
        const existing = currentHoldings.find((h) => h.id === item.holdingId);
        if (existing) {
          const updatedRecord: AssetHolding = {
            ...existing,
            existingAllocation: item.newValue,
            units: item.newUnits !== undefined ? item.newUnits : existing.units,
            grams:
              (existing.marketType === "GOLD" || existing.grams !== undefined) &&
              item.newUnits !== undefined
                ? item.newUnits
                : existing.grams,
            schemeCode: item.schemeCode || existing.schemeCode,
            externalId:
              item.externalId ||
              existing.externalId ||
              (item.schemeCode ? String(item.schemeCode) : undefined),
            externalSource: existing.externalSource || "INDMONEY",
            investedAmount:
              item.investedAmount !== undefined
                ? item.investedAmount
                : existing.investedAmount,
            nav: item.nav !== undefined ? item.nav : existing.nav,
            lastSyncedAt: nowIso,
          };
          await db.assetsHoldings.put(updatedRecord);
          updatedCount++;
        }
      } else if (item.status === "new") {
        const newRecord: Omit<AssetHolding, "id"> = {
          holders_id: item.holderId,
          assetClasses_id: item.assetClasses_id || 1,
          assetSubClasses_id: item.assetSubClasses_id || 1,
          goals_id: null,
          assetDetail: item.assetName,
          existingAllocation: item.newValue,
          units: item.newUnits,
          schemeCode: item.schemeCode,
          externalId:
            item.externalId ||
            (item.schemeCode ? String(item.schemeCode) : undefined),
          externalSource: "INDMONEY",
          investedAmount: item.investedAmount,
          nav: item.nav,
          lastSyncedAt: nowIso,
          sip: 0,
          sipTypes_id: 1,
          buckets_id: 1, // Default short-term/general bucket
          comments: "Imported from INDmoney",
        };
        await db.assetsHoldings.add(newRecord as AssetHolding);
        addedCount++;
      }
    }
  });

  return { updatedCount, addedCount, updatedLiabilitiesCount };
}
