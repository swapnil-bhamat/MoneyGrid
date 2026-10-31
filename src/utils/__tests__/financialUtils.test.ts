import { describe, it, expect } from 'vitest';
import {
  calculateEMI,
  projectLoanBalance,
  calculateXIRR
} from '../financialUtils';

describe('financialUtils', () => {
  describe('calculateEMI', () => {
    it('calculates EMI correctly for standard inputs', () => {
      // 100,000 principal, 10% annual interest, 12 months
      // EMI = 100000 * (0.10/12) * (1+0.10/12)^12 / ((1+0.10/12)^12 - 1)
      // Approx 8791.58 -> 8792
      const emi = calculateEMI(100000, 10, 12);
      expect(emi).toBe(8792);
    });

    it('returns 0 for invalid principal', () => {
      expect(calculateEMI(0, 10, 12)).toBe(0);
      expect(calculateEMI(-100, 10, 12)).toBe(0);
    });

    it('handles 0% interest', () => {
      // 120,000 / 12 = 10,000
      expect(calculateEMI(120000, 0, 12)).toBe(10000);
    });
  });

  describe('projectLoanBalance', () => {
    it('reduces balance correctly over projection period', () => {
      // 100,000 balance. 0 interest. 10,000 EMI. 5 months.
      // Should result in 50,000
      const balance = projectLoanBalance(100000, 10000, 0, 5);
      expect(balance).toBe(50000);
    });

    it('handles standard loan amortization', () => {
       // 1000 loan. 10% monthly for simplicity? No, function takes annual.
       // Let's use simple numbers. 
       // 1200 loan, 120 Emi, 0 interest, 1 month.
       expect(projectLoanBalance(1200, 120, 0, 1)).toBe(1080);
    });
    
    it('does not go below zero', () => {
      expect(projectLoanBalance(100, 100, 0, 5)).toBe(0);
    });
  });

  describe('calculateXIRR', () => {
    it('calculates correct XIRR for simple case', () => {
      // Invest 100 today, get 110 in 1 year. Return is 10%.
      const dates = [new Date('2024-01-01'), new Date('2025-01-01')];
      const values = [-100, 110];
      const xirr = calculateXIRR(values, dates);
      expect(xirr).toBeCloseTo(0.10, 2);
    });

    it('throws error for mismatched arrays', () => {
      expect(() => calculateXIRR([-100], [])).toThrow();
    });
  });
});
