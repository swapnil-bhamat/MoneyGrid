import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BucketRefillAdvisor from "../BucketRefillAdvisor";

// Mock Dexie and dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: () => ({
    SWP_MONTHLY_AMOUNT: "20000",
    SWP_REFILL_TRIGGER_YEARS: "2",
    SWP_REFILL_TARGET_YEARS: "5",
    SWP_INFLATION_STEP_UP: "6",
    SWP_LAST_BUCKET2_RETURN_NEGATIVE: "false",
  }),
}));

vi.mock("@/infrastructure/db/db", () => ({
  db: {
    configs: {
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/services/configService", () => ({
  CONFIG_KEYS: {
    SWP_MONTHLY_AMOUNT: "SWP_MONTHLY_AMOUNT",
    SWP_REFILL_TRIGGER_YEARS: "SWP_REFILL_TRIGGER_YEARS",
    SWP_REFILL_TARGET_YEARS: "SWP_REFILL_TARGET_YEARS",
    SWP_INFLATION_STEP_UP: "SWP_INFLATION_STEP_UP",
    SWP_LAST_BUCKET2_RETURN_NEGATIVE: "SWP_LAST_BUCKET2_RETURN_NEGATIVE",
  },
  saveAppConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/utils/numberUtils", () => ({
  toLocalCurrency: (val: number) => `₹${val.toLocaleString("en-IN")}`,
}));

describe("BucketRefillAdvisor Component", () => {
  it("renders No Refill Needed state when Bucket 1 runway is above trigger", () => {
    // 20,000/mo = 240,000/yr. 600,000 is 2.5 yrs (> 2 yrs trigger)
    render(<BucketRefillAdvisor liveBucket1={600000} liveBucket2={5000000} />);

    expect(screen.getByText("Bucket 1 Refill Advisor")).toBeInTheDocument();
    expect(screen.getByText("No Refill Needed")).toBeInTheDocument();
    expect(screen.getByText(/safely above the/)).toBeInTheDocument();
  });

  it("renders Refill Recommended state when Bucket 1 runway is below trigger", () => {
    // 20,000/mo = 240,000/yr. 300,000 is 1.25 yrs (< 2 yrs trigger)
    render(<BucketRefillAdvisor liveBucket1={300000} liveBucket2={5000000} />);

    expect(screen.getByText("Refill Recommended")).toBeInTheDocument();
    expect(screen.getByText(/from Long Term → Short Term/)).toBeInTheDocument();
  });

  it("enables manual simulation mode when toggle is clicked", () => {
    render(<BucketRefillAdvisor liveBucket1={600000} liveBucket2={5000000} />);

    const manualToggle = screen.getByLabelText("Use custom numbers");
    expect(manualToggle).not.toBeChecked();

    fireEvent.click(manualToggle);
    expect(manualToggle).toBeChecked();
    expect(screen.getByText("What-If Simulation")).toBeInTheDocument();
    expect(screen.getByText("Simulation Inputs (What-If)")).toBeInTheDocument();
  });

  it("shows Rule 7 guardrail message when negative return is checked", () => {
    render(<BucketRefillAdvisor liveBucket1={600000} liveBucket2={5000000} />);

    const checkbox = screen.getByLabelText(
      /Bucket 2 had negative return this period/i
    );
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText(/Rule 7 Guardrail:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/skip this year's SWP inflation step-up/i)
    ).toBeInTheDocument();
  });
});
