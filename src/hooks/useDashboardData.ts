import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { AssetPurpose } from "@/infrastructure/db/db";
import { calculateProjectedValue } from "@/services/projectionService";
import { calculateRemainingBalance, calculateEMI } from "@/utils/financialUtils";

const getGoalAllocationByName = (
  goals: Array<{ name: string; allocatedAmount: number }>,
  matcher: RegExp,
) =>
  goals
    .filter((goal) => matcher.test(goal.name))
    .reduce((sum, goal) => sum + goal.allocatedAmount, 0);

const assetClassColors = [
  "#2ecc71",
  "#e74c3c",
  "#f1c40f",
  "#3498db",
  "#9b59b6",
  "#34495e",
];
const assetGoalColors = [
  "#8e44ad",
  "#16a085",
  "#d35400",
  "#c0392b",
  "#27ae60",
  "#2980b9",
];
const savingsColors = [
  "#f39c12",
  "#1abc9c",
  "#e67e22",
  "#7f8c8d",
  "#bdc3c7",
  "#2c3e50",
];

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
        map: Record<number, { name: string; total: number }>,
        purpose: AssetPurpose,
      ) => {
        if (purpose.id) {
          map[purpose.id] = { name: purpose.name, total: 0 };
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
        (purpose): purpose is { name: string; total: number } =>
          purpose.total > 0,
      )
      .map((purpose) => ({
        id: purpose.name,
        value: purpose.total,
        label: purpose.name,
        total: totalIncome,
      }));

    const withPercentage = ["Need", "Savings", "Want"]
      .map((key) => {
        const item = expensesByPurpose.find((i) => i.id === key);
        if (!item) return null;
        const percentage = (item.value / item.total) * 100;
        let isValid = true;
        let rule = "";

        if (key === "Need") {
          rule = "≤ 50%";
          if (percentage > 50) isValid = false;
        }
        if (key === "Want") {
          rule = "≤ 20%";
          if (percentage > 20) isValid = false;
        }
        if (key === "Savings") {
          rule = "≥ 30%";
          if (percentage < 30) isValid = false;
        }

        return { ...item, percentage, isValid, rule };
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

    const assetClassAllocation = assetClasses
      .filter((ac) => classAllocationMap[ac.id] > 0)
      .map((ac) => ({
        id: ac.id,
        label: ac.name,
        value: classAllocationMap[ac.id],
        color: assetClassColors[assetClasses.indexOf(ac) % assetClassColors.length]
      }));

    // 6. Calculate asset allocation by goal
    const goalAllocationMap: Record<number, number> = {};
    holdings.forEach((h) => {
      if (h.goals_id) {
        goalAllocationMap[h.goals_id] =
          (goalAllocationMap[h.goals_id] || 0) + h.existingAllocation;
      }
    });

    const assetAllocationByGoal = goals
      .filter((goal) => goalAllocationMap[goal.id] > 0)
      .map((goal) => ({
        id: goal.id,
        label: goal.name,
        value: goalAllocationMap[goal.id],
      }));

    // 7. Calculate asset allocation by bucket
    const bucketAllocationMap: Record<number, number> = {};
    holdings.forEach((h) => {
      if (h.buckets_id) {
        bucketAllocationMap[h.buckets_id] =
          (bucketAllocationMap[h.buckets_id] || 0) + h.existingAllocation;
      }
    });

    const assetAllocationByBucket = buckets
      .filter((bucket) => bucketAllocationMap[bucket.id] > 0)
      .map((bucket) => ({
        id: bucket.id,
        label: bucket.name,
        value: bucketAllocationMap[bucket.id],
      }));

    // 8. Calculate savings cash flow
    const savingsPurposeIds = purposes
      .filter((p) => p.type === "savings")
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

    const savingsCashFlow = Object.entries(groupedSavings).map(([label, total]) => ({
      id: label,
      label,
      value: total,
    }));

    // 9. Card data
    const cardData = [
      {
        title: "Total Assets",
        value: totalAssets,
        bg: "primary",
        text: "white",
        url: "/assets-holdings",
      },
      {
        title: "Total Liabilities",
        value: totalLiabilities,
        bg: "danger",
        text: "white",
        url: "/liabilities",
      },
      {
        title: "Net Worth",
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
      .map((item) => ({
        ...item,
        color: assetClassColors[assetClasses.findIndex((ac) => ac.id === item.id) % assetClassColors.length]
      }))
      .sort((a, b) => b.value - a.value);

    // 12. Financial Freedom Metrics
    const financialFreedomMetrics = {
      income: totalIncome,
      assets: totalAssets,
      liabilities: totalLiabilities,
      expenses: expensesByPurpose.find((e) => e.id === "Need")?.value || 0,
      wants: expensesByPurpose.find((e) => e.id === "Want")?.value || 0,
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
  };
}
