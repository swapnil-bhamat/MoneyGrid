import { describe, it, expect } from 'vitest';
import {
  calculateProjectedValue,
  calculateProjectedBalance,
  generateChartData
} from '../projectionService';

describe('projectionService', () => {
  describe('calculateProjectedValue', () => {
    it('calculates future value properly', () => {
      // 1000 current, 0 monthly, 0 lumpsum, 0 redemption, 10% return
      // After 1 year: 1000 * 1.1 = 1100
      const val = calculateProjectedValue(1000, 0, 0, 0, 10);
      expect(val).toBeCloseTo(1100, 1);
    });
  });

  describe('calculateProjectedBalance', () => {
    it('returns 0 for future loans starting after projection period', () => {
        // Loan starts 2 years from now.
        const now = new Date();
        const startYear = now.getFullYear() + 2;
        const startDate = `01-01-${startYear}`;
        
        const balance = calculateProjectedBalance(0, 0, 1000, 0, 10, startDate);
        expect(balance).toBe(0);
    });
  });

  describe('generateChartData', () => {
    it('generates correct number of data points', () => {
      const data = generateChartData(5, [], [], 0);
      expect(data).toHaveLength(5);
      expect(data[0].year).toBe(new Date().getFullYear());
      expect(data[4].year).toBe(new Date().getFullYear() + 4);
    });

    it('calculates inflation adjusted net worth', () => {
         // 0 assets, 0 liabilities, 5 years, 10% inflation
         const data = generateChartData(2, [], [], 10);
         // Year 0: Real NW = 0 / 1.1^0 = 0
         expect(data[0].realNetWorth).toBe(0);
    });
  });
});
