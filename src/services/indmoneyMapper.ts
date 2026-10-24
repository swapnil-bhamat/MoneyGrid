import {
  INDMoneyPayload,
  INDMoneyHoldingItem,
  ReconciliationItem,
  ReconciliationResult,
  ReconciliationCategory,
  DetectedMember,
} from "@/types/indmoney.types";
import { AssetHolding, Holder, AssetSubClass } from "@/infrastructure/db/db.types";
import { db } from "@/infrastructure/db/db";

/**
 * Normalizes text for resilient matching (lowercase, removes punctuation, ignores common noise words)
 */
export function normalizeName(name: string): string {
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

  if (!parsed || (typeof parsed !== "object")) {
    throw new Error("Invalid JSON: Root must be an object.");
  }

  if (!parsed.members && !parsed.family) {
    throw new Error("Invalid INDmoney format: Expected 'members' or 'family' object.");
  }

  return parsed as INDMoneyPayload;
}

/**
 * Maps INDmoney member key or label to local Holder ID (Completely generic for open-source use)
 */
export function resolveHolderId(
  memberKey: string,
  memberName: string | undefined,
  holders: Holder[],
  customMap?: Record<string, number>,
  relation?: string,
  memberIndex?: number
): { id: number; name: string } {
  // 1. Check custom user selection from UI first
  if (customMap && customMap[memberKey] !== undefined) {
    const mapped = holders.find((h) => h.id === customMap[memberKey]);
    if (mapped) return { id: mapped.id, name: mapped.name };
  }

  const normalizedKey = memberKey.toLowerCase().trim();
  const normalizedName = (memberName || "").toLowerCase().trim();
  const normalizedRel = (relation || "").toLowerCase().trim();

  // 2. Direct name or externalKeys alias match against all database holders
  for (const h of holders) {
    const hName = h.name.toLowerCase().trim();
    const aliases = (h.externalKeys || []).map((k) => k.toLowerCase().trim());
    if (
      aliases.includes(normalizedKey) ||
      aliases.includes(normalizedName) ||
      (hName && (normalizedKey.includes(hName) || normalizedName.includes(hName) || hName.includes(normalizedKey)))
    ) {
      return { id: h.id, name: h.name };
    }
  }

  // 3. Generic relationship keywords
  if (
    normalizedRel.includes("spouse") ||
    normalizedRel.includes("wife") ||
    normalizedRel.includes("husband") ||
    normalizedKey.includes("spouse") ||
    normalizedKey.includes("wife") ||
    normalizedKey.includes("husband")
  ) {
    if (holders[1]) return { id: holders[1].id, name: holders[1].name };
  }

  if (
    normalizedRel.includes("self") ||
    normalizedRel.includes("head") ||
    normalizedKey.includes("head") ||
    normalizedKey.includes("self")
  ) {
    if (holders[0]) return { id: holders[0].id, name: holders[0].name };
  }

  // 4. Default positional mapping (Member 0 -> Holder 0, Member 1 -> Holder 1)
  if (memberIndex !== undefined && holders[memberIndex]) {
    return { id: holders[memberIndex].id, name: holders[memberIndex].name };
  }

  // 5. Fallback
  return holders[0] ? { id: holders[0].id, name: holders[0].name } : { id: 1, name: "Primary Holder" };
}

/**
 * Matches an INDmoney holding item to an existing MoneyGrid asset holding
 */
function findBestHoldingMatch(
  indHolding: INDMoneyHoldingItem,
  holderId: number,
  category: ReconciliationCategory,
  availableHoldings: AssetHolding[]
): AssetHolding | undefined {
  const indName = indHolding.name || indHolding.scheme_name || "";
  const normIndName = normalizeName(indName);
  const indSchemeId = String(indHolding.scheme_id || "").trim();

  // Filter holdings for this holder
  const holderCandidates = availableHoldings.filter((h) => h.holders_id === holderId);

  // 1. Direct Scheme Code or External ID match if present
  if (indSchemeId) {
    const codeMatch = holderCandidates.find(
      (h) =>
        (h.schemeCode && String(h.schemeCode).trim() === indSchemeId) ||
        (h.externalId && String(h.externalId).trim() === indSchemeId)
    );
    if (codeMatch) return codeMatch;
  }

  // 2. High confidence normalized name token overlap
  const indTokens = normIndName.split(" ").filter((t) => t.length > 2);
  let bestMatch: AssetHolding | undefined;
  let highestScore = 0;

  for (const cand of holderCandidates) {
    const candNorm = normalizeName(cand.assetDetail);
    const candTokens = candNorm.split(" ").filter((t) => t.length > 2);

    // Exact normalized match
    if (candNorm === normIndName) {
      return cand;
    }

    // Token intersection score
    const matchingTokens = indTokens.filter((t) => candTokens.includes(t));
    const score = matchingTokens.length;

    // Special case for Corporate Bond / Debt bucket
    if (
      category === "mutual_fund" &&
      normIndName.includes("corporate bond") &&
      (candNorm.includes("debt bucket") || cand.comments?.toLowerCase().includes("corporate bond"))
    ) {
      return cand;
    }

    // Special case for Bank names
    if (category === "savings_account") {
      if (
        (normIndName.includes("baroda") && candNorm.includes("bob")) ||
        (normIndName.includes("axis") && candNorm.includes("axis")) ||
        (normIndName.includes("sbi") && candNorm.includes("sbi")) ||
        (normIndName.includes("hdfc") && candNorm.includes("hdfc")) ||
        (normIndName.includes("icici") && candNorm.includes("icici"))
      ) {
        return cand;
      }
    }

    if (score > highestScore && score >= Math.min(2, indTokens.length)) {
      highestScore = score;
      bestMatch = cand;
    }
  }

  return bestMatch;
}

/**
 * Generates a full reconciliation comparison between INDmoney payload and current IndexedDB state
 */
export function generateReconciliationDiff(
  payload: INDMoneyPayload,
  currentHoldings: AssetHolding[],
  holders: Holder[],
  assetSubClasses: AssetSubClass[] = [],
  customHolderMap?: Record<string, number>
): ReconciliationResult {
  const items: ReconciliationItem[] = [];
  const matchedHoldingIds = new Set<number>();
  const detectedMembers: DetectedMember[] = [];
  let rowSeq = 0;

  const membersObj = payload.members || {};

  // Find sub-class IDs for stock and MF defaults
  const stockSubClass = assetSubClasses.find((sc) => sc.name.toLowerCase().includes("stock"))?.id || 2;
  const equityMfSubClass = assetSubClasses.find((sc) => sc.name.toLowerCase().includes("equity mutual"))?.id || 1;
  const liquidSubClass = assetSubClasses.find((sc) => sc.name.toLowerCase().includes("sa balance"))?.id || 14;

  // Track detected members
  let memberIdx = 0;
  for (const [memberKey] of Object.entries(membersObj)) {
    const familyMemberInfo = payload.family?.members?.find((m) => m.key === memberKey);
    const memberName = familyMemberInfo?.name || memberKey;
    const resolved = resolveHolderId(
      memberKey,
      memberName,
      holders,
      customHolderMap,
      familyMemberInfo?.relation_to_user,
      memberIdx++
    );
    detectedMembers.push({
      key: memberKey,
      name: memberName,
      resolvedHolderId: resolved.id,
    });
  }

  let mIdx = 0;
  for (const [memberKey, memberData] of Object.entries(membersObj)) {
    const familyMemberInfo = payload.family?.members?.find((m) => m.key === memberKey);
    const holderInfo = resolveHolderId(
      memberKey,
      familyMemberInfo?.name,
      holders,
      customHolderMap,
      familyMemberInfo?.relation_to_user,
      mIdx++
    );
    const assets = memberData.assets || {};

    // 1. Process Mutual Funds
    if (assets.mutual_fund?.holdings) {
      for (const mf of assets.mutual_fund.holdings) {
        const val = mf.current_value ?? mf.market_value ?? 0;
        const qty = mf.quantity ?? mf.units ?? 0;
        const investedAmt = mf.invested_amount ?? mf.invested;
        const unitNav = mf.unit_price ?? mf.nav;
        const extId = mf.scheme_id ? String(mf.scheme_id).trim() : undefined;
        const name = mf.name || mf.scheme_name || "Unknown Mutual Fund";
        const matched = findBestHoldingMatch(mf, holderInfo.id, "mutual_fund", currentHoldings);

        if (matched) {
          matchedHoldingIds.add(matched.id);
          const oldVal = matched.existingAllocation || 0;
          const oldUnits = matched.units;
          const delta = Number((val - oldVal).toFixed(2));
          const isChanged = Math.abs(delta) > 0.01 || (qty > 0 && Math.abs((oldUnits || 0) - qty) > 0.001);

          items.push({
            id: `mf-${matched.id}-${rowSeq++}`,
            holdingId: matched.id,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: matched.assetDetail,
            category: "mutual_fund",
            categoryLabel: "Mutual Fund",
            oldValue: oldVal,
            newValue: val,
            delta,
            oldUnits,
            newUnits: qty,
            schemeCode: mf.scheme_id,
            externalId: extId,
            investedAmount: investedAmt,
            nav: unitNav,
            assetSubClasses_id: matched.assetSubClasses_id,
            assetClasses_id: matched.assetClasses_id,
            status: isChanged ? "update" : "unchanged",
            selected: isChanged,
          });
        } else {
          // New MF holding in INDmoney not found in app
          items.push({
            id: `mf-new-${rowSeq++}`,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: name,
            category: "mutual_fund",
            categoryLabel: "Mutual Fund (New)",
            oldValue: 0,
            newValue: val,
            delta: val,
            newUnits: qty,
            schemeCode: mf.scheme_id,
            externalId: extId,
            investedAmount: investedAmt,
            nav: unitNav,
            assetSubClasses_id: equityMfSubClass,
            assetClasses_id: 1, // Equity
            status: "new",
            selected: true,
          });
        }
      }
    }

    // 2. Process EPF
    if (assets.epf) {
      const epfVal = assets.epf.total_value ?? (assets.epf.holdings || []).reduce((s, h) => s + (h.market_value || h.current_value || 0), 0);
      const epfInvested = assets.epf.invested;
      if (epfVal > 0) {
        const matched = currentHoldings.find(
          (h) => h.holders_id === holderInfo.id && (h.assetSubClasses_id === 6 || normalizeName(h.assetDetail).includes("epf"))
        );
        if (matched) {
          matchedHoldingIds.add(matched.id);
          const oldVal = matched.existingAllocation || 0;
          const delta = Number((epfVal - oldVal).toFixed(2));
          const isChanged = Math.abs(delta) > 0.01;
          items.push({
            id: `epf-${matched.id}-${rowSeq++}`,
            holdingId: matched.id,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: matched.assetDetail,
            category: "retirement",
            categoryLabel: "EPF",
            oldValue: oldVal,
            newValue: epfVal,
            delta,
            investedAmount: epfInvested,
            status: isChanged ? "update" : "unchanged",
            selected: isChanged,
          });
        }
      }
    }

    // 3. Process NPS
    if (assets.nps) {
      const npsVal = assets.nps.total_value ?? assets.nps.holdings?.[0]?.market_value ?? 0;
      const npsInvested = assets.nps.invested ?? assets.nps.holdings?.[0]?.invested;
      if (npsVal > 0) {
        const matched = currentHoldings.find(
          (h) => h.holders_id === holderInfo.id && normalizeName(h.assetDetail).includes("nps")
        );
        if (matched) {
          matchedHoldingIds.add(matched.id);
          const oldVal = matched.existingAllocation || 0;
          const delta = Number((npsVal - oldVal).toFixed(2));
          const isChanged = Math.abs(delta) > 0.01;
          items.push({
            id: `nps-${matched.id}-${rowSeq++}`,
            holdingId: matched.id,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: matched.assetDetail,
            category: "retirement",
            categoryLabel: "NPS",
            oldValue: oldVal,
            newValue: npsVal,
            delta,
            investedAmount: npsInvested,
            status: isChanged ? "update" : "unchanged",
            selected: isChanged,
          });
        }
      }
    }

    // 4. Process Fixed Deposit
    if (assets.fixed_deposit) {
      const fdVal = assets.fixed_deposit.total_value ?? (assets.fixed_deposit.holdings || []).reduce((s, h) => s + (h.market_value || 0), 0);
      const fdInvested = assets.fixed_deposit.invested;
      if (fdVal > 0) {
        const matched = currentHoldings.find(
          (h) => h.holders_id === holderInfo.id && h.assetSubClasses_id === 9
        );
        if (matched) {
          matchedHoldingIds.add(matched.id);
          const oldVal = matched.existingAllocation || 0;
          const delta = Number((fdVal - oldVal).toFixed(2));
          const isChanged = Math.abs(delta) > 0.01;
          items.push({
            id: `fd-${matched.id}-${rowSeq++}`,
            holdingId: matched.id,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: matched.assetDetail,
            category: "fixed_deposit",
            categoryLabel: "Fixed Deposit",
            oldValue: oldVal,
            newValue: fdVal,
            delta,
            investedAmount: fdInvested,
            status: isChanged ? "update" : "unchanged",
            selected: isChanged,
          });
        }
      }
    }

    // 5. Process Gold
    if (assets.gold && (assets.gold.total_value || assets.gold.invested)) {
      const goldVal = assets.gold.total_value ?? assets.gold.invested ?? 0;
      const goldInvested = assets.gold.invested;
      if (goldVal > 0) {
        // Find existing gold holdings for this holder, or across family if holder doesn't have gold
        let goldHoldings = currentHoldings.filter(
          (h) => h.holders_id === holderInfo.id && (h.assetClasses_id === 4 || h.marketType === "GOLD" || normalizeName(h.assetDetail).includes("gold"))
        );

        if (goldHoldings.length === 0) {
          goldHoldings = currentHoldings.filter(
            (h) => h.assetClasses_id === 4 || h.marketType === "GOLD" || normalizeName(h.assetDetail).includes("gold")
          );
        }

        if (goldHoldings.length === 1) {
          const matched = goldHoldings[0];
          matchedHoldingIds.add(matched.id);
          const oldVal = matched.existingAllocation || 0;
          const delta = Number((goldVal - oldVal).toFixed(2));
          const isChanged = Math.abs(delta) > 0.01;
          items.push({
            id: `gold-${matched.id}-${rowSeq++}`,
            holdingId: matched.id,
            holderId: matched.holders_id,
            holderName: holders.find((h) => h.id === matched.holders_id)?.name || holderInfo.name,
            assetName: matched.assetDetail,
            category: "gold",
            categoryLabel: "Gold",
            oldValue: oldVal,
            newValue: goldVal,
            delta,
            investedAmount: goldInvested,
            status: isChanged ? "update" : "unchanged",
            selected: isChanged,
            notes: matched.grams ? `${matched.grams}g (${matched.goldPurity || "24K"})` : undefined,
          });
        } else if (goldHoldings.length > 1) {
          // Multiple gold holdings: distribute authoritative valuation proportionally
          const totalExistingGold = goldHoldings.reduce((sum, h) => sum + (h.existingAllocation || 0), 0);
          let distributedSum = 0;

          goldHoldings.forEach((gh, idx) => {
            matchedHoldingIds.add(gh.id);
            const oldVal = gh.existingAllocation || 0;
            let share = 0;
            if (idx === goldHoldings.length - 1) {
              share = Number((goldVal - distributedSum).toFixed(2));
            } else {
              const ratio = totalExistingGold > 0 ? oldVal / totalExistingGold : 1 / goldHoldings.length;
              share = Number((goldVal * ratio).toFixed(2));
              distributedSum += share;
            }

            const delta = Number((share - oldVal).toFixed(2));
            const isChanged = Math.abs(delta) > 0.01;
            const ghHolder = holders.find((h) => h.id === gh.holders_id);

            items.push({
              id: `gold-${gh.id}-${rowSeq++}`,
              holdingId: gh.id,
              holderId: gh.holders_id,
              holderName: ghHolder?.name || holderInfo.name,
              assetName: gh.assetDetail,
              category: "gold",
              categoryLabel: "Gold",
              oldValue: oldVal,
              newValue: share,
              delta,
              investedAmount: goldInvested ? Number((goldInvested * (oldVal / (totalExistingGold || 1))).toFixed(2)) : undefined,
              status: isChanged ? "update" : "unchanged",
              selected: isChanged,
              notes: gh.grams ? `${gh.grams}g (${gh.goldPurity || "24K"})` : undefined,
            });
          });
        }
      }
    }

    // 6. Process Savings Accounts
    if (assets.savings_account?.holdings) {
      for (const sa of assets.savings_account.holdings) {
        const val = sa.market_value ?? sa.current_value ?? 0;
        const name = sa.name || "Savings Account";
        const matched = findBestHoldingMatch(sa, holderInfo.id, "savings_account", currentHoldings);

        if (matched) {
          matchedHoldingIds.add(matched.id);
          const oldVal = matched.existingAllocation || 0;
          const delta = Number((val - oldVal).toFixed(2));
          const isChanged = Math.abs(delta) > 0.01;
          items.push({
            id: `sa-${matched.id}-${rowSeq++}`,
            holdingId: matched.id,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: matched.assetDetail,
            category: "savings_account",
            categoryLabel: "Bank Account",
            oldValue: oldVal,
            newValue: val,
            delta,
            status: isChanged ? "update" : "unchanged",
            selected: isChanged,
          });
        } else if (val > 0) {
          // New bank account balance detected in INDmoney - preselect for auto-update
          items.push({
            id: `sa-new-${rowSeq++}`,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: name,
            category: "savings_account",
            categoryLabel: "Bank Account (New)",
            oldValue: 0,
            newValue: val,
            delta: val,
            assetSubClasses_id: liquidSubClass,
            assetClasses_id: 3, // Liquid
            status: "new",
            selected: true,
          });
        }
      }
    }

    // 7. Process Indian Stocks
    if (assets.indian_stock?.holdings) {
      for (const st of assets.indian_stock.holdings) {
        const val = st.market_value ?? st.current_value ?? 0;
        const qty = st.quantity ?? st.units ?? 0;
        const investedAmt = st.invested_amount ?? st.invested;
        const unitPrice = st.unit_price;
        const extId = st.investment_code || st.scheme_id;
        const name = st.name || "Stock";
        const matched = currentHoldings.find(
          (h) =>
            h.holders_id === holderInfo.id &&
            ((extId && (h.externalId === extId || h.schemeCode === extId)) ||
              normalizeName(h.assetDetail) === normalizeName(name))
        );

        if (matched) {
          matchedHoldingIds.add(matched.id);
          const oldVal = matched.existingAllocation || 0;
          const delta = Number((val - oldVal).toFixed(2));
          const isChanged = Math.abs(delta) > 0.01;
          items.push({
            id: `st-${matched.id}-${rowSeq++}`,
            holdingId: matched.id,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: matched.assetDetail,
            category: "stock",
            categoryLabel: "Stock",
            oldValue: oldVal,
            newValue: val,
            delta,
            oldUnits: matched.units,
            newUnits: qty,
            externalId: extId,
            investedAmount: investedAmt,
            nav: unitPrice,
            status: isChanged ? "update" : "unchanged",
            selected: isChanged,
          });
        } else {
          items.push({
            id: `st-new-${rowSeq++}`,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: name,
            category: "stock",
            categoryLabel: "Stock (New)",
            oldValue: 0,
            newValue: val,
            delta: val,
            newUnits: qty,
            externalId: extId,
            investedAmount: investedAmt,
            nav: unitPrice,
            assetSubClasses_id: stockSubClass,
            assetClasses_id: 1, // Equity
            status: "new",
            selected: true,
          });
        }
      }
    }

    // 8. Process Real Estate
    if (assets.real_estate?.holdings) {
      for (const re of assets.real_estate.holdings) {
        const val = re.market_value ?? re.current_value ?? 0;
        const matched = currentHoldings.find(
          (h) => h.holders_id === holderInfo.id && (h.assetSubClasses_id === 20 || h.assetSubClasses_id === 22 || normalizeName(h.assetDetail).includes("wadi"))
        );
        if (matched) {
          matchedHoldingIds.add(matched.id);
          const oldVal = matched.existingAllocation || 0;
          const delta = Number((val - oldVal).toFixed(2));
          items.push({
            id: `re-${matched.id}-${rowSeq++}`,
            holdingId: matched.id,
            holderId: holderInfo.id,
            holderName: holderInfo.name,
            assetName: matched.assetDetail,
            category: "real_estate",
            categoryLabel: "Real Estate",
            oldValue: oldVal,
            newValue: val,
            delta,
            status: Math.abs(delta) > 0.01 ? "update" : "unchanged",
            selected: Math.abs(delta) > 0.01,
          });
        }
      }
    }
  }

  // 9. Capture App-Only Holdings (Protected & Untouched)
  for (const holding of currentHoldings) {
    if (!matchedHoldingIds.has(holding.id)) {
      const holder = holders.find((h) => h.id === holding.holders_id);
      let catLabel = "Other Asset";
      if (holding.assetClasses_id === 4) catLabel = "Physical Gold";
      if (holding.assetSubClasses_id === 12) catLabel = "SSY Account";

      items.push({
        id: `app-only-${holding.id}-${rowSeq++}`,
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
  customHolderMap?: Record<string, number>
): Promise<{ updatedCount: number; addedCount: number }> {
  let updatedCount = 0;
  let addedCount = 0;

  await db.transaction("rw", [db.assetsHoldings, db.holders], async () => {
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

      if (item.status === "update" && item.holdingId) {
        const existing = currentHoldings.find((h) => h.id === item.holdingId);
        if (existing) {
          const updatedRecord: AssetHolding = {
            ...existing,
            existingAllocation: item.newValue,
            units: item.newUnits !== undefined ? item.newUnits : existing.units,
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

  return { updatedCount, addedCount };
}
