import { calculateXIRR, projectLoanBalance } from "@/utils/financialUtils";
import {
  AssetProjection,
  LiabilityProjection,
} from "@/infrastructure/db/db.types";

export interface ProjectionData extends AssetProjection {
  assetSubClassName: string;
  expectedReturns: number;
  currentAllocation: number;
  currentMonthlyInvestment: number;
  projectedValue: number;
}

export interface LiabilityProjectionData extends LiabilityProjection {
  loanTypeName: string;
  interestRate: number;
  currentBalance: number;
  currentEmi: number;
  projectedBalance: number;
  isFutureLoan?: boolean;
}

export const calculateProjectedValue = (
  currentAllocation: number,
  newMonthly: number,
  lumpsum: number,
  redemption: number,
  expectedReturns: number
) => {
  const monthlyReturn = expectedReturns / 12 / 100;
  const totalMonthlyInvestment = newMonthly;
  const years = 1; // Projection for 1 year (base calculation)

  // Future value of current allocation
  const futureValue =
    currentAllocation * Math.pow(1 + expectedReturns / 100, years);

  // Future value of monthly investments (current + new)
  const monthlyFV =
    totalMonthlyInvestment *
    ((Math.pow(1 + monthlyReturn, years * 12) - 1) / monthlyReturn);

  // Add lumpsum investment with its growth
  const lumpsumFV = lumpsum * Math.pow(1 + expectedReturns / 100, years);

  // Subtract redemption
  return futureValue + monthlyFV + lumpsumFV - redemption;
};

export const calculateProjectedBalance = (
  currentBalance: number,
  currentEmi: number,
  newEmi: number,
  prepayment: number,
  interestRate: number,
  startDate?: string // For future loans
) => {
  const monthlyRate = interestRate / 12 / 100;
  const emiToUse = newEmi > 0 ? newEmi : currentEmi;
  let balance = currentBalance;

  // For future loans, calculate months from start date to 1 year from now
  let monthsToProject = 12;
  if (startDate) {
    // Parse date - handle both DD-MM-YYYY and YYYY-MM-DD formats
    let start: Date;
    const parts = startDate.split("-").map(Number);

    if (parts[0] > 1000) {
      // YYYY-MM-DD format
      start = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      // DD-MM-YYYY format
      start = new Date(parts[2], parts[1] - 1, parts[0]);
    }

    const now = new Date();
    const oneYearFromNow = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate()
    );

    if (start > oneYearFromNow) {
      // Loan starts after projection period (1 year from now)
      return 0;
    }

    if (start > now) {
      // Loan starts in the future but before 1 year from now
      // Calculate months from start date to 1 year from now
      const monthsDiff =
        (oneYearFromNow.getFullYear() - start.getFullYear()) * 12 +
        (oneYearFromNow.getMonth() - start.getMonth());
      monthsToProject = Math.max(0, monthsDiff);
    } else {
      // Loan already started - project 12 months from now
      monthsToProject = 12;
    }
  }

  // Simulate months of payments
  for (let month = 0; month < monthsToProject; month++) {
    // Add interest for the month
    balance = balance * (1 + monthlyRate);

    // Pay EMI (covers interest first, then principal)
    if (emiToUse > 0) {
      balance = Math.max(0, balance - emiToUse);
    }

    // Apply prepayment if applicable (assume done at end of projection period)
    if (month === monthsToProject - 1 && prepayment > 0) {
      balance = Math.max(0, balance - prepayment);
    }
  }

  return balance;
};

export const calculateNetWorthXIRR = (
  currentNetWorth: number,
  projectedNetWorth: number,
  assetProjectionData: ProjectionData[],
  liabilityProjectionData: LiabilityProjectionData[]
): number => {
  try {
    if (currentNetWorth > 0 && projectedNetWorth > 0) {
      const flows: number[] = [];
      const dates: Date[] = [];
      const now = new Date();

      // Initial Investment (Current Net Worth) - treated as outflow
      flows.push(-currentNetWorth);
      dates.push(now);

      // Monthly Investments (SIPs + EMIs)
      for (let i = 1; i <= 12; i++) {
        const date = new Date(
          now.getFullYear(),
          now.getMonth() + i,
          now.getDate()
        );
        let monthlyOutflow = 0;

        // 1. SIPs (Outflow)
        const totalSIP =
          assetProjectionData?.reduce(
            (sum, item) => sum + item.newMonthlyInvestment,
            0
          ) || 0;
        monthlyOutflow += totalSIP;

        // 2. EMIs (Outflow) & Future Loan Amount (Inflow)
        if (liabilityProjectionData) {
          for (const lp of liabilityProjectionData) {
            let isEmiActive = true;

            if (lp.isFutureLoan && lp.startDate) {
              let start: Date;
              const parts = lp.startDate.split("-").map(Number);
              if (parts[0] > 1000) {
                start = new Date(parts[0], parts[1] - 1, parts[2]);
              } else {
                start = new Date(parts[2], parts[1] - 1, parts[0]);
              }

              if (start > date) {
                isEmiActive = false;
              }
            }

            if (isEmiActive) {
              monthlyOutflow += lp.currentEmi;
            }
          }
        }

        if (monthlyOutflow > 0) {
          flows.push(-monthlyOutflow);
          dates.push(date);
        }
      }

      // Add Future Loan Amounts as Inflows (Positive Cash Flow)
      if (liabilityProjectionData) {
        for (const lp of liabilityProjectionData) {
          if (lp.isFutureLoan && lp.startDate && lp.loanAmount) {
            let start: Date;
            const parts = lp.startDate.split("-").map(Number);
            if (parts[0] > 1000) {
              start = new Date(parts[0], parts[1] - 1, parts[2]);
            } else {
              start = new Date(parts[2], parts[1] - 1, parts[0]);
            }

            const oneYearFromNow = new Date(
              now.getFullYear() + 1,
              now.getMonth(),
              now.getDate()
            );

            if (start >= now && start <= oneYearFromNow) {
              flows.push(lp.loanAmount);
              dates.push(start);
            }
          }
        }
      }

      // Annual Lumpsums & Prepayments
      const totalAnnualLumpsum =
        assetProjectionData?.reduce(
          (sum, item) => sum + item.lumpsumExpected,
          0
        ) || 0;
      const totalAnnualPrepayment =
        liabilityProjectionData?.reduce(
          (sum, item) => sum + item.prepaymentExpected,
          0
        ) || 0;
      const totalAnnualOutflow = totalAnnualLumpsum + totalAnnualPrepayment;

      if (totalAnnualOutflow > 0) {
        flows.push(-totalAnnualOutflow);
        dates.push(
          new Date(now.getFullYear(), now.getMonth() + 12, now.getDate())
        );
      }

      // Final Value (Projected Net Worth) - treated as inflow
      flows.push(projectedNetWorth);
      dates.push(
        new Date(now.getFullYear(), now.getMonth() + 12, now.getDate())
      );

      return calculateXIRR(flows, dates) * 100;
    }
  } catch (e) {
    console.error("XIRR Calculation failed", e);
  }
  return 0;
};

export const generateChartData = (
  projectionYears: number,
  assetProjectionData: ProjectionData[] | undefined,
  liabilityProjectionData: LiabilityProjectionData[] | undefined,
  inflationRate: number
) => {
  return Array.from({ length: projectionYears }, (_, i) => {
    const year = new Date().getFullYear() + i;

    // Calculate projected assets for this year with proper SIP/Lumpsum accounting
    let projectedAssets = 0;

    if (assetProjectionData) {
      projectedAssets = assetProjectionData.reduce((sum, asset) => {
        const monthlyReturn = asset.expectedReturns / 12 / 100;
        const years = i; // Years from now

        // If this is year 0, use current allocation
        if (i === 0) {
          return sum + asset.currentAllocation;
        }

        // Future value of current allocation after i years
        const currentValueFV =
          asset.currentAllocation * Math.pow(1 + asset.expectedReturns / 100, years);

        // Future value of monthly SIPs over i years
        // FV = PMT × [(1+r)^n - 1] / r
        const monthlyFV =
          asset.newMonthlyInvestment > 0
            ? asset.newMonthlyInvestment *
              ((Math.pow(1 + monthlyReturn, years * 12) - 1) / monthlyReturn)
            : 0;

        // Future value of annual lumpsums (assuming invested at start of each year)
        // This is also an annuity: FV = PMT × [(1+r)^n - 1] / r, but annual
        const lumpsumFV =
          asset.lumpsumExpected > 0
            ? asset.lumpsumExpected *
              ((Math.pow(1 + asset.expectedReturns / 100, years) - 1) /
                (asset.expectedReturns / 100))
            : 0;

        // For simplicity, assume redemptions happen once at the end (not recurring)
        // Only apply in year 1 (Wait, original code said "Only apply in year 1". 
        // If projection is for N years, redemption should probably be handled differently.
        // But let's stick to original logic: "const redemption = years === 1 ? asset.redemptionExpected : 0;")
        // Actually, if I look at the original code:
        // const redemption = years === 1 ? asset.redemptionExpected : 0;
        // This means redemption is only subtracted if we are looking at exactly 1 year from now?
        // Or is it cumulative?
        // If I project 5 years, and redemption is "Expected Redemption", is it one-time?
        // The original logic seems to imply it's a one-time thing happening in the first year.
        const redemption = i === 1 ? asset.redemptionExpected : 0; 
        // Wait, original code was: const redemption = years === 1 ? asset.redemptionExpected : 0;
        // In the loop, `years` was `i`. So yes, if i === 1.

        return sum + currentValueFV + monthlyFV + lumpsumFV - redemption;
      }, 0);
    }

    // Calculate projected liabilities for this year
    let projectedLiabilities = 0;

    if (liabilityProjectionData) {
      projectedLiabilities = liabilityProjectionData.reduce((sum, lp) => {
        let balance = 0;

        if (lp.isFutureLoan && lp.startDate) {
          // Logic for future loan
          let loanStart: Date;
          const parts = lp.startDate.split("-").map(Number);

          if (parts[0] > 1000) {
            loanStart = new Date(parts[0], parts[1] - 1, parts[2]);
          } else {
            loanStart = new Date(parts[2], parts[1] - 1, parts[0]);
          }

          const now = new Date();
          const targetDate = new Date(
            now.getFullYear() + i,
            now.getMonth(),
            now.getDate()
          );

          if (targetDate >= loanStart) {
            const monthsActive = Math.max(
              0,
              (targetDate.getFullYear() - loanStart.getFullYear()) * 12 +
                (targetDate.getMonth() - loanStart.getMonth())
            );

            balance = projectLoanBalance(
              lp.loanAmount || 0,
              lp.currentEmi,
              lp.interestRate,
              monthsActive,
              lp.prepaymentExpected / 12
            );
          } else {
            balance = 0;
          }
        } else {
          // Existing loan
          balance = projectLoanBalance(
            lp.currentBalance,
            lp.currentEmi,
            lp.interestRate,
            i * 12,
            lp.prepaymentExpected / 12
          );
        }
        return sum + Math.max(0, balance);
      }, 0);
    }

    const nominalNetWorth = projectedAssets - projectedLiabilities;
    const inflationFactor = Math.pow(1 + inflationRate / 100, i);
    const realNetWorth = nominalNetWorth / inflationFactor;

    return {
      year,
      assets: Math.round(projectedAssets),
      liabilities: Math.round(projectedLiabilities),
      netWorth: Math.round(nominalNetWorth),
      realNetWorth: Math.round(realNetWorth),
    };
  });
};
