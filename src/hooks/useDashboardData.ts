import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { AssetPurpose } from "@/infrastructure/db/db";
import { calculateProjectedValue } from "@/services/projectionService";
import { calculateRemainingBalance, calculateEMI } from "@/utils/financialUtils";
import { t } from "@/utils/localization";
import { FINANCIAL_CATEGORIES, BUDGET_RULES } from "@/utils/constants";
import { getKeywordDetails } from "@/utils/keywordRegistry";

const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getGoalAllocationByName = (
  goals: Array<{ name: string; allocatedAmount: number }>,
  matcher: RegExp,
) =>
  goals
    .filter((goal) => matcher.test(goal.name))
    .reduce((sum, goal) => sum + goal.allocatedAmount, 0);

const assetClassColors = [
  "#4361ee", // Indigo Blue
  "#2ec4b6", // Mint Teal
  "#ff9f1c", // Tangerine Orange
  "#e63946", // Coral Red
  "#7209b7", // Royal Purple
  "#ffd166", // Lemon Yellow
];
const assetGoalColors = [
  "#7209b7", // Royal Purple
  "#2ec4b6", // Mint Teal
  "#ff9f1c", // Tangerine Orange
  "#e63946", // Coral Red
  "#ffd166", // Lemon Yellow
  "#4361ee", // Indigo Blue
];
const savingsColors = [
  "#ff9f1c", // Tangerine Orange
  "#00b4d8", // Sky Cyan
  "#ff006e", // Hot Pink
  "#2ec4b6", // Mint Teal
  "#7209b7", // Royal Purple
  "#ffd166", // Lemon Yellow
];
const incomeColors = [
  "#2ec4b6", // Mint Teal
  "#4361ee", // Indigo Blue
  "#7209b7", // Royal Purple
  "#ff9f1c", // Tangerine Orange
  "#ffd166", // Lemon Yellow
  "#ff006e", // Hot Pink
  "#e63946", // Coral Red
  "#00b4d8", // Sky Cyan
];

const assignUniqueColors = <T>(
  items: T[],
  labelExtractor: (item: T) => string,
  palette: string[]
) => {
  const usedColors = new Set<string>();
  return items.map((item, index) => {
    const label = labelExtractor(item);
    const details = getKeywordDetails(label);
    let color = (details && details.icon !== "🏷️") ? details.hex : "";
    if (!color || usedColors.has(color)) {
      color = palette[index % palette.length];
      const unique = palette.find((c) => !usedColors.has(c));
      if (unique) color = unique;
    }
    usedColors.add(color);
    return {
      item,
      color,
    };
  });
};

export function useDashboardData() {
  const data = useLiveQuery(async () => {
    // Gathers all data atomically in a single Promise.all
    const [
      holders,
      accounts,
      cashFlows,
      holdings,
      liabilities,
      loanTypes,
      purposes,
      incomes,
      assetClasses,
      assetSubClasses,
      assetsProjection,
      goals,
      buckets,
    ] = await Promise.all([
      db.holders.toArray(),
      db.accounts.toArray(),
      db.cashFlow.toArray(),
      db.assetsHoldings.toArray(),
      db.liabilities.toArray(),
      db.loanTypes.toArray(),
      db.assetPurposes.toArray(),
      db.income.toArray(),
      db.assetClasses.toArray(),
      db.assetSubClasses.toArray(),
      db.assetsProjection.toArray(),
      db.goals.toArray(),
      db.buckets.toArray(),
    ]);

    // 1. Calculate transfer rows
    let transferRows: Array<{
      holderName: string;
      bankInfo: string;
      amount: number;
    }> = [];
    let totalTransferAmount = 0;

    holders.forEach((holder) => {
      const holderAccounts = accounts.filter(
        (acc) => acc.holders_id === holder.id,
      );
      holderAccounts.forEach((acc) => {
        const amount = cashFlows
          .filter(
            (cf) => cf.holders_id === holder.id && cf.accounts_id === acc.id,
          )
          .reduce((sum, cf) => sum + (cf.monthly || 0), 0);
        if (amount !== 0) {
          totalTransferAmount += amount;
          transferRows.push({
            holderName: holder.name,
            bankInfo: acc.bank,
            amount,
          });
        }
      });
    });

    transferRows = transferRows.sort((a, b) => {
      const nameCompare = a.holderName.localeCompare(b.holderName);
      if (nameCompare !== 0) return nameCompare;
      return b.amount - a.amount;
    });

    // 2. Calculate total assets
    const totalAssets = holdings.reduce(
      (sum, holding) => sum + holding.existingAllocation,
      0,
    );

    // 3. Calculate liabilities & EMIs
    const liabilitiesData = liabilities.reduce(
      (acc, liability) => {
        const loanType = loanTypes.find(
          (lt) => lt.id === liability.loanType_id,
        );
        if (!loanType) return acc;

        const balance = calculateRemainingBalance(
          liability.loanAmount,
          loanType.interestRate,
          liability.totalMonths,
          liability.loanStartDate,
        );

        let emi = 0;
        if (balance > 0) {
          emi = calculateEMI(
            liability.loanAmount,
            loanType.interestRate,
            liability.totalMonths,
          );
        }

        return { sum: acc.sum + balance, emi: acc.emi + emi };
      },
      { sum: 0, emi: 0 },
    );

    const totalLiabilities = liabilitiesData.sum;
    const totalEmi = liabilitiesData.emi;
    const netWorth = totalAssets - totalLiabilities;

    // 4. Calculate expenses by purpose
    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.monthly), 0);
    const purposeMap = purposes.reduce(
      (
        map: Record<number, { name: string; type: string; total: number }>,
        purpose: AssetPurpose,
      ) => {
        if (purpose.id) {
          map[purpose.id] = { name: purpose.name, type: purpose.type || "", total: 0 };
        }
        return map;
      },
      {},
    );

    cashFlows.forEach((flow) => {
      if (flow.assetPurpose_id && purposeMap[flow.assetPurpose_id]) {
        purposeMap[flow.assetPurpose_id].total += flow.monthly;
      }
    });

    const expensesByPurpose = Object.values(purposeMap)
      .filter(
        (purpose): purpose is { name: string; type: string; total: number } =>
          purpose.total > 0,
      )
      .map((purpose) => ({
        id: purpose.name,
        type: purpose.type,
        value: purpose.total,
        label: purpose.name,
        total: totalIncome,
      }));

    const withPercentage = [FINANCIAL_CATEGORIES.NEED, FINANCIAL_CATEGORIES.SAVINGS, FINANCIAL_CATEGORIES.WANT]
      .map((typeKey) => {
        const item = expensesByPurpose.find((i) => i.type?.toLowerCase() === typeKey);
        if (!item) return null;
        const percentage = (item.value / item.total) * 100;
        let isValid = true;
        let rule = "";

        if (typeKey === FINANCIAL_CATEGORIES.NEED) {
          rule = `≤ ${BUDGET_RULES.NEED_LIMIT}%`;
          if (percentage > BUDGET_RULES.NEED_LIMIT) isValid = false;
        }
        if (typeKey === FINANCIAL_CATEGORIES.WANT) {
          rule = `≤ ${BUDGET_RULES.WANT_LIMIT}%`;
          if (percentage > BUDGET_RULES.WANT_LIMIT) isValid = false;
        }
        if (typeKey === FINANCIAL_CATEGORIES.SAVINGS) {
          rule = `≥ ${BUDGET_RULES.SAVINGS_FLOOR}%`;
          if (percentage < BUDGET_RULES.SAVINGS_FLOOR) isValid = false;
        }

        const keyName = capitalize(typeKey);
        const lookupKey = (typeKey === FINANCIAL_CATEGORIES.SAVINGS ? "saving" : typeKey) as keyof typeof t.keywords;
        const localizedLabel = t.keywords[lookupKey] || item.label;

        return {
          id: keyName, // Maintain backward compatibility for pages that index on "Need"/"Savings"/"Want"
          type: typeKey,
          value: item.value,
          label: localizedLabel,
          total: item.total,
          percentage,
          isValid,
          rule,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // 5. Calculate asset class allocation
    const projectedSubClassIds = new Set(
      assetsProjection.map((projection) => projection.assetSubClasses_id),
    );
    const subClassToClassMap = new Map(
      assetSubClasses.map((subClass) => [
        subClass.id,
        subClass.assetClasses_id,
      ]),
    );
    const classAllocationMap: Record<number, number> = {};

    holdings.forEach((holding) => {
      if (projectedSubClassIds.has(holding.assetSubClasses_id)) {
        const assetClassId = subClassToClassMap.get(
          holding.assetSubClasses_id,
        );

        if (assetClassId) {
          classAllocationMap[assetClassId] =
            (classAllocationMap[assetClassId] || 0) +
            holding.existingAllocation;
        }
      }
    });

    const assetClassAllocation = assignUniqueColors(
      assetClasses.filter((ac) => classAllocationMap[ac.id] > 0),
      (ac) => ac.name,
      assetClassColors
    ).map(({ item: ac, color }) => ({
      id: ac.id,
      label: ac.name,
      value: classAllocationMap[ac.id],
      color
    }));

    // 6. Calculate asset allocation by goal
    const goalAllocationMap: Record<number, number> = {};
    holdings.forEach((h) => {
      if (h.goals_id) {
        goalAllocationMap[h.goals_id] =
          (goalAllocationMap[h.goals_id] || 0) + h.existingAllocation;
      }
    });

    const assetAllocationByGoal = assignUniqueColors(
      goals.filter((goal) => goalAllocationMap[goal.id] > 0),
      (goal) => goal.name,
      assetGoalColors
    ).map(({ item: goal, color }) => ({
      id: goal.id,
      label: goal.name,
      value: goalAllocationMap[goal.id],
      color
    }));

    // 7. Calculate asset allocation by bucket
    const bucketAllocationMap: Record<number, number> = {};
    holdings.forEach((h) => {
      if (h.buckets_id) {
        bucketAllocationMap[h.buckets_id] =
          (bucketAllocationMap[h.buckets_id] || 0) + h.existingAllocation;
      }
    });

    const assetAllocationByBucket = assignUniqueColors(
      buckets.filter((bucket) => bucketAllocationMap[bucket.id] > 0),
      (bucket) => bucket.name,
      assetClassColors
    ).map(({ item: bucket, color }) => ({
      id: bucket.id,
      label: bucket.name,
      value: bucketAllocationMap[bucket.id],
      color
    }));

    // 8. Calculate savings cash flow
    const savingsPurposeIds = purposes
      .filter((p) => p.type === FINANCIAL_CATEGORIES.SAVINGS)
      .map((p) => p.id);
    const goalMap: Record<number, { name: string; total: number }> = {};
    goals.forEach((goal) => {
      if (goal.id) {
        goalMap[goal.id] = { name: goal.name, total: 0 };
      }
    });

    const savingsFlows = cashFlows.filter((flow) =>
      savingsPurposeIds.includes(flow.assetPurpose_id),
    );
    const groupedSavings: Record<string, number> = {};
    savingsFlows.forEach((flow) => {
      const label =
        flow.goal_id && goalMap[flow.goal_id]?.name
          ? goalMap[flow.goal_id].name
          : "No Goal";
      groupedSavings[label] = (groupedSavings[label] || 0) + flow.monthly;
    });

    const savingsCashFlow = assignUniqueColors(
      Object.entries(groupedSavings),
      ([label]) => label,
      savingsColors
    ).map(({ item: [label, total], color }) => ({
      id: label,
      label,
      value: total,
      color
    }));

    // 9. Card data
    const cardData = [
      {
        title: t.dashboard.totalAssets,
        value: totalAssets,
        bg: "primary",
        text: "white",
        url: "/assets-holdings",
      },
      {
        title: t.dashboard.totalLiabilities,
        value: totalLiabilities,
        bg: "danger",
        text: "white",
        url: "/liabilities",
      },
      {
        title: t.dashboard.netWorth,
        value: netWorth,
        bg: "success",
        text: "white",
        url: "",
      },
    ];

    // 10. Goal Progress
    const goalProgress = goals
      .map((goal) => ({
        id: goal.id,
        name: goal.name,
        targetAmount: goal.amountRequiredToday || 0,
        allocatedAmount: goalAllocationMap[goal.id] || 0,
        gap: (goal.amountRequiredToday || 0) - (goalAllocationMap[goal.id] || 0),
      }))
      .sort((a, b) => b.targetAmount - a.targetAmount);

    // 11. Projected Asset Growth
    const assetClassMap = new Map(
      assetClasses.map((assetClass) => [assetClass.id, assetClass.name]),
    );

    const getCurrentAllocation = (assetSubClassId: number) =>
      holdings
        .filter((holding) => holding.assetSubClasses_id === assetSubClassId)
        .reduce((sum, holding) => sum + holding.existingAllocation, 0);

    const projectedMap: Record<
      number,
      { id: number; label: string; currentValue: number; value: number }
    > = {};

    assetsProjection.forEach((projection) => {
      const subClass = assetSubClasses.find(
        (item) => item.id === projection.assetSubClasses_id
      );
      const assetClassId = subClass?.assetClasses_id;

      if (!assetClassId) return;

      const currentValue = getCurrentAllocation(
        projection.assetSubClasses_id
      );
      const value = calculateProjectedValue(
        currentValue,
        projection.newMonthlyInvestment,
        projection.lumpsumExpected,
        projection.redemptionExpected,
        subClass.expectedReturns || 0
      );

      if (!projectedMap[assetClassId]) {
        projectedMap[assetClassId] = {
          id: assetClassId,
          label: assetClassMap.get(assetClassId) || "Unknown",
          currentValue: 0,
          value: 0,
        };
      }

      projectedMap[assetClassId].currentValue += currentValue;
      projectedMap[assetClassId].value += value;
    });

    const projectedAssetGrowth = Object.values(projectedMap)
      .filter((item) => item.currentValue > 0 || item.value > 0)
      .map((item) => {
        const matchingClass = assetClassAllocation.find((ac) => ac.id === item.id);
        const color = matchingClass?.color || assetClassColors[assetClasses.findIndex((ac) => ac.id === item.id) % assetClassColors.length];
        return {
          ...item,
          color
        };
      })
      .sort((a, b) => b.value - a.value);

    // 12. Income allocation by source
    const incomeAllocation = assignUniqueColors(
      incomes,
      (inc) => inc.item || holders.find((h) => h.id === inc.holders_id)?.name || "Other Income",
      incomeColors
    )
      .map(({ item: inc, color }) => ({
        id: String(inc.id),
        label: inc.item || holders.find((h) => h.id === inc.holders_id)?.name || "Other Income",
        value: Number(inc.monthly),
        color
      }))
      .filter((item) => item.value > 0);

    // 13. Financial Freedom Metrics
    const financialFreedomMetrics = {
      income: totalIncome,
      assets: totalAssets,
      liabilities: totalLiabilities,
      expenses: expensesByPurpose.find((e) => e.type === FINANCIAL_CATEGORIES.NEED || e.id === capitalize(FINANCIAL_CATEGORIES.NEED))?.value || 0,
      wants: expensesByPurpose.find((e) => e.type === FINANCIAL_CATEGORIES.WANT || e.id === capitalize(FINANCIAL_CATEGORIES.WANT))?.value || 0,
      emergencyFund: getGoalAllocationByName(goalProgress, /emergency/i),
      retirementAssets: getGoalAllocationByName(goalProgress, /fire/i),
      emi: totalEmi,
    };

    return {
      cardData,
      withPercentage,
      transferRows,
      totalTransferAmount,
      savingsCashFlow,
      assetClassAllocation,
      assetAllocationByGoal,
      assetAllocationByBucket,
      goalProgress,
      projectedAssetGrowth,
      financialFreedomMetrics,
      incomeAllocation,
    };
  });

  // Provide fallback state while loading
  const fallback = {
    cardData: [
      { title: "Total Assets", value: 0, bg: "primary", text: "white", url: "/assets-holdings" },
      { title: "Total Liabilities", value: 0, bg: "danger", text: "white", url: "/liabilities" },
      { title: "Net Worth", value: 0, bg: "success", text: "white", url: "" },
    ],
    withPercentage: [],
    transferRows: [],
    totalTransferAmount: 0,
    savingsCashFlow: [],
    assetClassAllocation: [],
    assetAllocationByGoal: [],
    assetAllocationByBucket: [],
    goalProgress: [],
    projectedAssetGrowth: [],
    incomeAllocation: [],
    financialFreedomMetrics: {
      income: 0,
      assets: 0,
      liabilities: 0,
      expenses: 0,
      wants: 0,
      emergencyFund: 0,
      retirementAssets: 0,
      emi: 0,
    },
  };

  return {
    ...(data || fallback),
    assetClassColors,
    assetGoalColors,
    savingsColors,
    incomeColors,
  };
}
