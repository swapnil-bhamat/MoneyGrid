import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AssetAllocationProjectionPage from '../AssetAllocationProjectionPage';


// Mock Dexie hooks
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (_: any) => {
    // If it's a function, run it. If it returns a promise, we can't easily sync it here without more complex mocking.
    // Ideally, we return mocked data based on what the component expects.
    // The component uses multiple useLiveQuery calls. We need to distinguish them or return a merged object/array that satisfies all safe checks?
    // Actually, useLiveQuery runs the callback.
    // Let's rely on the fact that we can mock the values returned by the hook if we mock the implementation differently.
    
    // Simplest approach: Return dummy data for everything.
    // The component calls useLiveQuery 6 times.
    // 1. userConfig
    // 2. assetSubClasses
    // 3. assetsHoldings
    // 4. assetsProjection
    // 5. liabilities
    // 6. liabilitiesProjection
    
    // We can't easily distinguish WHICH call it is inside the mock without context.
    // A common pattern is to use `vi.mocked` against the import if we want to change return values per test.
    // Or we make the mock return a large object that effectively works for "arrays" (like empty array) and objects?
    
    // Better: Return a safe default (empty array) which satisfies most lists. 
    // For userConfig, it reduces an array to an object. Empty array -> empty object. Safe.
    return []; 
  }
}));

// Mock DB
vi.mock('../../services/db', () => ({
  db: {
    configs: { toArray: vi.fn().mockResolvedValue([]) },
    assetSubClasses: { toArray: vi.fn().mockResolvedValue([]) },
    assetsHoldings: { toArray: vi.fn().mockResolvedValue([]) },
    assetsProjection: { toArray: vi.fn().mockResolvedValue([]) },
    liabilities: { toArray: vi.fn().mockResolvedValue([]) },
    liabilitiesProjection: { toArray: vi.fn().mockResolvedValue([]) },
    loanTypes: { toArray: vi.fn().mockResolvedValue([]) },
  }
}));

// Mock Child Components
vi.mock('../../components/projections/NetWorthChart', () => ({ NetWorthChart: () => null }));
vi.mock('../../components/projections/AssetProjectionTable', () => ({ AssetProjectionTable: () => null }));
vi.mock('../../components/projections/LiabilityProjectionTable', () => ({ LiabilityProjectionTable: () => null }));

describe('AssetAllocationProjectionPage', () => {
  it('renders without crashing', () => {
    render(<AssetAllocationProjectionPage />);
    expect(screen.getByText('Current Net Worth')).toBeInTheDocument();
    //expect(screen.getByText('Net Worth Chart')).toBeInTheDocument(); // Removed as we return null now
  });
});
