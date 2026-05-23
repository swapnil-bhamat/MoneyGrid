import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';


// Mock the hook from context
vi.mock('@/contexts/DashboardDataContext', () => ({
  useSharedDashboardData: () => ({
    cardData: [
      { title: 'Net Worth', value: 5000000, bg: 'success', text: 'white' },
      { title: 'Assets', value: 6000000, bg: 'primary', text: 'white' }
    ],
    withPercentage: [],
    transferRows: [],
    totalTransferAmount: 0,
    savingsCashFlow: [],
    assetClassAllocation: [],
    assetAllocationByGoal: [],
    assetClassColors: [],
    assetGoalColors: [],
    savingsColors: [],
    assetAllocationByBucket: [],
    goalProgress: [],
    projectedAssetGrowth: []
  })
}));

// Mock Utils
vi.mock('@/utils/numberUtils', () => ({
  toLocalCurrency: (val: number) => `₹${val}`
}));

// Mock child components to avoid deep rendering issues or missing contexts
vi.mock('@/components/widgets/DailyTipCard', () => ({ default: () => null }));
vi.mock('@/components/widgets/GoldRateCard', () => ({ default: () => null }));
vi.mock('@/components/budgets/GoalProgressChart', () => ({ default: () => null }));
vi.mock('@/components/common/Gauge', () => ({ default: () => null }));
vi.mock('@/components/analytics/CashFlowDiagram', () => ({ default: () => null }));

// Mock Recharts to avoid resizing observer errors in JSDOM
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  PieChart: ({ children }: any) => children,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null
}));

describe('Dashboard Component', () => {
  it('renders stats cards correctly', () => {
    render(<Dashboard />); // Does Dashboard need to be wrapped in Router? No, assuming it doesn't use Link or useNavigate at top level.
    // Dashboard uses window.location.href in onClick.
    
    expect(screen.getByText('Net Worth')).toBeInTheDocument();
    // Check for value loosely or just ensure card exists
    expect(screen.getByText(/5000000/)).toBeInTheDocument(); 
    expect(screen.getByText('Assets')).toBeInTheDocument();
  });
});
