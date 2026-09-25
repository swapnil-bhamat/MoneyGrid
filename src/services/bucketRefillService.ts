export interface BucketRefillInput {
  bucket1Value: number; // Short Term bucket current value
  bucket2Value: number; // Long Term bucket current value
  monthlySwp: number; // current monthly withdrawal
  refillTriggerYears: number; // default 2
  refillTargetYears: number; // default 5
  bucket2HadNegativeReturn?: boolean; // Rule 7 guardrail input
}

export interface BucketRefillResult {
  annualSwp: number;
  currentRunwayYears: number;
  refillNeeded: boolean;
  suggestedTransferAmount: number; // 0 if no refill needed
  projectedRunwayAfterRefill: number;
  withdrawalRateOnTotal: number; // %, informational vs 3.5% target
  guardrailTriggered: boolean; // true if bucket2HadNegativeReturn
  guardrailMessage?: string;
}

export function calculateBucketRefillRecommendation(
  input: BucketRefillInput
): BucketRefillResult {
  const annualSwp = Math.max(0, input.monthlySwp) * 12;
  const currentRunwayYears =
    annualSwp > 0 ? input.bucket1Value / annualSwp : Infinity;
  const refillNeeded = currentRunwayYears < input.refillTriggerYears;

  const targetBucket1 = input.refillTargetYears * annualSwp;
  const rawNeeded = Math.max(0, targetBucket1 - input.bucket1Value);
  const suggestedTransferAmount = refillNeeded
    ? Math.min(rawNeeded, Math.max(0, input.bucket2Value))
    : 0;

  const projectedRunwayAfterRefill =
    annualSwp > 0
      ? (input.bucket1Value + suggestedTransferAmount) / annualSwp
      : Infinity;

  const totalCorpus =
    Math.max(0, input.bucket1Value) + Math.max(0, input.bucket2Value);
  const withdrawalRateOnTotal =
    totalCorpus > 0 ? (annualSwp / totalCorpus) * 100 : 0;

  const guardrailTriggered = !!input.bucket2HadNegativeReturn;

  return {
    annualSwp,
    currentRunwayYears,
    refillNeeded,
    suggestedTransferAmount,
    projectedRunwayAfterRefill,
    withdrawalRateOnTotal,
    guardrailTriggered,
    guardrailMessage: guardrailTriggered
      ? "Bucket 2 had a negative return this period — per Rule 7, skip this year's SWP inflation step-up even if a refill happens."
      : undefined,
  };
}
