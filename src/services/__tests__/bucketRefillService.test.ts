import { describe, it, expect } from "vitest";
import {
  calculateBucketRefillRecommendation,
  BucketRefillInput,
} from "../bucketRefillService";

describe("bucketRefillService", () => {
  it("returns no refill needed when runway is above trigger years", () => {
    const input: BucketRefillInput = {
      bucket1Value: 600000,
      bucket2Value: 5000000,
      monthlySwp: 20000,
      refillTriggerYears: 2,
      refillTargetYears: 5,
    };

    const result = calculateBucketRefillRecommendation(input);

    expect(result.annualSwp).toBe(240000);
    expect(result.currentRunwayYears).toBe(2.5);
    expect(result.refillNeeded).toBe(false);
    expect(result.suggestedTransferAmount).toBe(0);
    expect(result.projectedRunwayAfterRefill).toBe(2.5);
    expect(result.withdrawalRateOnTotal).toBeCloseTo(4.2857, 2);
    expect(result.guardrailTriggered).toBe(false);
    expect(result.guardrailMessage).toBeUndefined();
  });

  it("calculates correct transfer amount to reach target years when runway is below trigger", () => {
    const input: BucketRefillInput = {
      bucket1Value: 360000,
      bucket2Value: 5000000,
      monthlySwp: 20000,
      refillTriggerYears: 2,
      refillTargetYears: 5,
    };

    const result = calculateBucketRefillRecommendation(input);

    expect(result.annualSwp).toBe(240000);
    expect(result.currentRunwayYears).toBe(1.5);
    expect(result.refillNeeded).toBe(true);
    expect(result.suggestedTransferAmount).toBe(840000);
    expect(result.projectedRunwayAfterRefill).toBe(5);
  });

  it("caps transfer amount when Bucket 2 has less than the required amount", () => {
    const input: BucketRefillInput = {
      bucket1Value: 240000,
      bucket2Value: 500000,
      monthlySwp: 20000,
      refillTriggerYears: 2,
      refillTargetYears: 5,
    };

    const result = calculateBucketRefillRecommendation(input);

    expect(result.refillNeeded).toBe(true);
    expect(result.suggestedTransferAmount).toBe(500000);
    expect(result.projectedRunwayAfterRefill).toBeCloseTo(3.0833, 2);
  });

  it("triggers Rule 7 guardrail with human-readable message when bucket2HadNegativeReturn is true", () => {
    const input: BucketRefillInput = {
      bucket1Value: 300000,
      bucket2Value: 4000000,
      monthlySwp: 20000,
      refillTriggerYears: 2,
      refillTargetYears: 5,
      bucket2HadNegativeReturn: true,
    };

    const result = calculateBucketRefillRecommendation(input);

    expect(result.guardrailTriggered).toBe(true);
    expect(result.guardrailMessage).toBe(
      "Bucket 2 had a negative return this period — per Rule 7, skip this year's SWP inflation step-up even if a refill happens."
    );
  });

  it("handles edge case: monthlySwp = 0 without error or division by zero", () => {
    const input: BucketRefillInput = {
      bucket1Value: 500000,
      bucket2Value: 2000000,
      monthlySwp: 0,
      refillTriggerYears: 2,
      refillTargetYears: 5,
    };

    const result = calculateBucketRefillRecommendation(input);

    expect(result.annualSwp).toBe(0);
    expect(result.currentRunwayYears).toBe(Infinity);
    expect(result.refillNeeded).toBe(false);
    expect(result.suggestedTransferAmount).toBe(0);
    expect(result.projectedRunwayAfterRefill).toBe(Infinity);
    expect(result.withdrawalRateOnTotal).toBe(0);
  });

  it("handles edge case: bucket1Value = 0", () => {
    const input: BucketRefillInput = {
      bucket1Value: 0,
      bucket2Value: 2000000,
      monthlySwp: 25000,
      refillTriggerYears: 2,
      refillTargetYears: 5,
    };

    const result = calculateBucketRefillRecommendation(input);

    expect(result.currentRunwayYears).toBe(0);
    expect(result.refillNeeded).toBe(true);
    expect(result.suggestedTransferAmount).toBe(1500000);
    expect(result.projectedRunwayAfterRefill).toBe(5);
  });

  it("handles edge case: both buckets empty (0)", () => {
    const input: BucketRefillInput = {
      bucket1Value: 0,
      bucket2Value: 0,
      monthlySwp: 20000,
      refillTriggerYears: 2,
      refillTargetYears: 5,
    };

    const result = calculateBucketRefillRecommendation(input);

    expect(result.currentRunwayYears).toBe(0);
    expect(result.refillNeeded).toBe(true);
    expect(result.suggestedTransferAmount).toBe(0);
    expect(result.projectedRunwayAfterRefill).toBe(0);
    expect(result.withdrawalRateOnTotal).toBe(0);
  });
});
