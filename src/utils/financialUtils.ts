/**
 * Calculates the Equated Monthly Installment (EMI) for a loan.
 * 
 * @param principal - The principal loan amount
 * @param annualInterestRate - The annual interest rate in percentage (e.g., 8.5 for 8.5%)
 * @param tenureMonths - The total tenure of the loan in months
 * @returns The monthly EMI amount
 */
export const calculateEMI = (
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number => {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualInterestRate <= 0) return principal / tenureMonths;

  const monthlyRate = annualInterestRate / 12 / 100;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  return Math.round(emi);
};

/**
 * Calculates the future value of a loan after N months from a starting balance.
 * Useful for projections.
 * 
 * @param currentBalance - The current outstanding balance
 * @param emi - The monthly EMI amount being paid
 * @param annualInterestRate - The annual interest rate in percentage
 * @param monthsToProject - Number of months to project forward
 * @param prepayment - Optional annual prepayment amount (assumed at end of year? or monthly?)
 *                     For this simple version, let's assume 0 or handle monthly if needed.
 * @returns The projected balance
 */
export const projectLoanBalance = (
  currentBalance: number,
  emi: number,
  annualInterestRate: number,
  monthsToProject: number,
  monthlyPrepayment: number = 0
): number => {
  let balance = currentBalance;
  const monthlyRate = annualInterestRate / 12 / 100;

  for (let i = 0; i < monthsToProject; i++) {
    if (balance <= 0) break;
    
    const interest = balance * monthlyRate;
    const principalComponent = emi - interest;
    
    // If EMI < Interest, balance grows! (Negative amortization)
    // But we assume standard loans where EMI covers interest.
    
    balance = balance - principalComponent - monthlyPrepayment;
  }

  return Math.max(0, Math.round(balance));
};

/**
 * Calculates the Extended Internal Rate of Return (XIRR) for a series of cash flows.
 * Uses the Newton-Raphson method.
 * 
 * @param values - Array of cash flow amounts (negative for outflows, positive for inflows)
 * @param dates - Array of dates corresponding to the cash flows
 * @param guess - Initial guess for the rate (default 0.1)
 * @returns The XIRR as a decimal (e.g., 0.12 for 12%)
 */
export const calculateXIRR = (values: number[], dates: Date[], guess: number = 0.1): number => {
  if (values.length !== dates.length) {
    throw new Error("Values and dates arrays must have the same length");
  }

  const x0 = guess;
  const limit = 100; // Max iterations
  const tol = 1e-5; // Tolerance

  let x = x0;
  
  // Normalize dates to days from the first date
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const days = dates.map(d => (d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < limit; i++) {
    let fValue = 0;
    let fDerivative = 0;

    for (let j = 0; j < values.length; j++) {
      const fraction = days[j] / 365;
      const term = Math.pow(1 + x, fraction);
      fValue += values[j] / term;
      fDerivative -= (values[j] * fraction) / (term * (1 + x));
    }

    const newX = x - fValue / fDerivative;

    if (Math.abs(newX - x) < tol) {
      return newX;
    }

    x = newX;
  }

  return x;
};
