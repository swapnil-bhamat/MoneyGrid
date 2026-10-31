import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UpcomingExpensesPage from '../UpcomingExpensesPage';
import type { UpcomingExpense } from '@/infrastructure/db/db';

const mockExpenses: UpcomingExpense[] = [
  {
    id: 1,
    title: 'October Pending Rent',
    description: '',
    amount: 15000,
    dueDate: '10-10-2026',
    assetPurpose_id: 1,
    isCompleted: false,
    notes: '',
  },
  {
    id: 2,
    title: 'November Completed Bill',
    description: '',
    amount: 2500,
    dueDate: '05-11-2026',
    assetPurpose_id: 1,
    isCompleted: true,
    notes: '',
  },
  {
    id: 3,
    title: 'December Zero Amount',
    description: '',
    amount: 0,
    dueDate: '15-12-2026',
    assetPurpose_id: 1,
    isCompleted: false,
    notes: '',
  },
];

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => unknown) => {
    // If querying db.upcomingExpenses
    const str = fn.toString();
    if (str.includes('upcomingExpenses')) {
      return mockExpenses;
    }
    if (str.includes('assetPurposes')) {
      return [{ id: 1, name: 'Needs' }];
    }
    return [];
  },
}));

vi.mock('@/infrastructure/db/db', () => ({
  db: {
    upcomingExpenses: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    assetPurposes: {
      toArray: vi.fn(),
    },
  },
}));

describe('UpcomingExpensesPage', () => {
  it('shows month accordion entry when total amount is greater than zero', () => {
    render(<UpcomingExpensesPage />);
    // October has a pending expense of 15000 -> Should appear
    expect(screen.getByText('October 2026')).toBeInTheDocument();
  });

  it('does not show month accordion entry when total amount for that month is zero', () => {
    render(<UpcomingExpensesPage />);
    // November has only completed expenses (total pending amount is 0) -> Should NOT appear
    expect(screen.queryByText('November 2026')).not.toBeInTheDocument();

    // December has only 0 amount expense -> Should NOT appear
    expect(screen.queryByText('December 2026')).not.toBeInTheDocument();
  });
});
