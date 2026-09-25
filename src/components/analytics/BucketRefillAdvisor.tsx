import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Alert,
  Badge,
  Collapse,
} from "react-bootstrap";
import {
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsShieldExclamation,
  BsGear,
  BsSliders,
  BsArrowLeftRight,
  BsCheckLg,
} from "react-icons/bs";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import {
  CONFIG_KEYS,
  saveAppConfig,
} from "@/services/configService";
import {
  calculateBucketRefillRecommendation,
} from "@/services/bucketRefillService";
import { toLocalCurrency } from "@/utils/numberUtils";

export interface BucketRefillAdvisorProps {
  liveBucket1: number;
  liveBucket2: number;
}

export const BucketRefillAdvisor: React.FC<BucketRefillAdvisorProps> = ({
  liveBucket1,
  liveBucket2,
}) => {
  // Read persisted configs
  const userConfig =
    useLiveQuery(async () => {
      const configs = await db.configs.toArray();
      return configs.reduce<Record<string, string>>((acc, curr) => {
        acc[curr.key] = String(curr.value);
        return acc;
      }, {});
    }) || {};

  const dbMonthlySwp = userConfig[CONFIG_KEYS.SWP_MONTHLY_AMOUNT]
    ? Number(userConfig[CONFIG_KEYS.SWP_MONTHLY_AMOUNT])
    : 20000;
  const dbTriggerYears = userConfig[CONFIG_KEYS.SWP_REFILL_TRIGGER_YEARS]
    ? Number(userConfig[CONFIG_KEYS.SWP_REFILL_TRIGGER_YEARS])
    : 2;
  const dbTargetYears = userConfig[CONFIG_KEYS.SWP_REFILL_TARGET_YEARS]
    ? Number(userConfig[CONFIG_KEYS.SWP_REFILL_TARGET_YEARS])
    : 5;
  const dbInflationStepUp = userConfig[CONFIG_KEYS.SWP_INFLATION_STEP_UP]
    ? Number(userConfig[CONFIG_KEYS.SWP_INFLATION_STEP_UP])
    : 6;

  // Manual What-If State
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualBucket1, setManualBucket1] = useState<number>(liveBucket1);
  const [manualBucket2, setManualBucket2] = useState<number>(liveBucket2);
  const [manualMonthlySwp, setManualMonthlySwp] = useState<number>(dbMonthlySwp);

  // Guardrail Checkbox
  const [bucket2HadNegativeReturn, setBucket2HadNegativeReturn] =
    useState<boolean>(false);

  // Settings Panel State
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsMonthlySwp, setSettingsMonthlySwp] = useState<number>(20000);
  const [settingsTriggerYears, setSettingsTriggerYears] = useState<number>(2);
  const [settingsTargetYears, setSettingsTargetYears] = useState<number>(5);
  const [settingsInflationStepUp, setSettingsInflationStepUp] =
    useState<number>(6);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync settings inputs when DB configs load
  useEffect(() => {
    if (userConfig[CONFIG_KEYS.SWP_MONTHLY_AMOUNT]) {
      setSettingsMonthlySwp(Number(userConfig[CONFIG_KEYS.SWP_MONTHLY_AMOUNT]));
    }
    if (userConfig[CONFIG_KEYS.SWP_REFILL_TRIGGER_YEARS]) {
      setSettingsTriggerYears(
        Number(userConfig[CONFIG_KEYS.SWP_REFILL_TRIGGER_YEARS])
      );
    }
    if (userConfig[CONFIG_KEYS.SWP_REFILL_TARGET_YEARS]) {
      setSettingsTargetYears(
        Number(userConfig[CONFIG_KEYS.SWP_REFILL_TARGET_YEARS])
      );
    }
    if (userConfig[CONFIG_KEYS.SWP_INFLATION_STEP_UP]) {
      setSettingsInflationStepUp(
        Number(userConfig[CONFIG_KEYS.SWP_INFLATION_STEP_UP])
      );
    }
    if (userConfig[CONFIG_KEYS.SWP_LAST_BUCKET2_RETURN_NEGATIVE]) {
      setBucket2HadNegativeReturn(
        userConfig[CONFIG_KEYS.SWP_LAST_BUCKET2_RETURN_NEGATIVE] === "true"
      );
    }
  }, [
    userConfig[CONFIG_KEYS.SWP_MONTHLY_AMOUNT],
    userConfig[CONFIG_KEYS.SWP_REFILL_TRIGGER_YEARS],
    userConfig[CONFIG_KEYS.SWP_REFILL_TARGET_YEARS],
    userConfig[CONFIG_KEYS.SWP_INFLATION_STEP_UP],
    userConfig[CONFIG_KEYS.SWP_LAST_BUCKET2_RETURN_NEGATIVE],
  ]);

  // Handle toggling manual mode: seed with current values
  const handleToggleManualMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsManualMode(checked);
    if (checked) {
      setManualBucket1(liveBucket1);
      setManualBucket2(liveBucket2);
      setManualMonthlySwp(dbMonthlySwp);
    }
  };

  // Save Settings handler
  const handleSaveSettings = async () => {
    try {
      await saveAppConfig(
        CONFIG_KEYS.SWP_MONTHLY_AMOUNT,
        String(settingsMonthlySwp)
      );
      await saveAppConfig(
        CONFIG_KEYS.SWP_REFILL_TRIGGER_YEARS,
        String(settingsTriggerYears)
      );
      await saveAppConfig(
        CONFIG_KEYS.SWP_REFILL_TARGET_YEARS,
        String(settingsTargetYears)
      );
      await saveAppConfig(
        CONFIG_KEYS.SWP_INFLATION_STEP_UP,
        String(settingsInflationStepUp)
      );
      await saveAppConfig(
        CONFIG_KEYS.SWP_LAST_BUCKET2_RETURN_NEGATIVE,
        String(bucket2HadNegativeReturn)
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save SWP settings", err);
    }
  };

  // Active calculation inputs
  const activeBucket1 = isManualMode ? manualBucket1 : liveBucket1;
  const activeBucket2 = isManualMode ? manualBucket2 : liveBucket2;
  const activeMonthlySwp = isManualMode ? manualMonthlySwp : dbMonthlySwp;
  const activeTriggerYears = dbTriggerYears;
  const activeTargetYears = dbTargetYears;

  const result = calculateBucketRefillRecommendation({
    bucket1Value: activeBucket1,
    bucket2Value: activeBucket2,
    monthlySwp: activeMonthlySwp,
    refillTriggerYears: activeTriggerYears,
    refillTargetYears: activeTargetYears,
    bucket2HadNegativeReturn,
  });

  const runwayDisplay =
    result.currentRunwayYears === Infinity
      ? "∞"
      : result.currentRunwayYears.toFixed(1);

  const projectedRunwayDisplay =
    result.projectedRunwayAfterRefill === Infinity
      ? "∞"
      : result.projectedRunwayAfterRefill.toFixed(1);

  return (
    <Card className="mb-3 shadow-sm border">
      <Card.Header className="py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <BsArrowLeftRight className="text-primary" />
          <span className="fw-bold">Bucket 1 Refill Advisor</span>
          <Badge bg={isManualMode ? "warning" : "info"} className="text-dark">
            {isManualMode ? "What-If Simulation" : "Live DB Data"}
          </Badge>
        </div>
        <div className="d-flex align-items-center gap-3">
          <Form.Check
            type="switch"
            id="advisor-manual-toggle"
            label="Use custom numbers"
            checked={isManualMode}
            onChange={handleToggleManualMode}
            className="small mb-0 user-select-none"
          />
          <Button
            variant="outline-secondary"
            size="sm"
            className="py-0 px-2"
            onClick={() => setShowSettings(!showSettings)}
            title="Configure Strategy Settings"
          >
            <BsGear className="me-1" />
            Settings
          </Button>
        </div>
      </Card.Header>

      <Card.Body className="py-3">
        {/* Settings Collapsible Panel */}
        <Collapse in={showSettings}>
          <div className="mb-3 p-3 bg-body-secondary rounded border">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-1">
                <BsSliders /> SWP & Refill Parameters
              </h6>
              {saveSuccess && (
                <span className="text-success small fw-semibold">
                  <BsCheckLg className="me-1" />
                  Saved!
                </span>
              )}
            </div>
            <Row className="g-2">
              <Col xs={12} sm={6} md={3}>
                <Form.Group controlId="settingMonthlySwp">
                  <Form.Label className="small text-body-secondary mb-1">
                    Monthly SWP
                  </Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    value={settingsMonthlySwp}
                    onChange={(e) =>
                      setSettingsMonthlySwp(Number(e.target.value) || 0)
                    }
                  />
                </Form.Group>
              </Col>
              <Col xs={6} sm={6} md={3}>
                <Form.Group controlId="settingTriggerYears">
                  <Form.Label className="small text-body-secondary mb-1">
                    Refill Trigger (Years)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    step="0.5"
                    value={settingsTriggerYears}
                    onChange={(e) =>
                      setSettingsTriggerYears(Number(e.target.value) || 0)
                    }
                  />
                </Form.Group>
              </Col>
              <Col xs={6} sm={6} md={3}>
                <Form.Group controlId="settingTargetYears">
                  <Form.Label className="small text-body-secondary mb-1">
                    Refill Target (Years)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    step="0.5"
                    value={settingsTargetYears}
                    onChange={(e) =>
                      setSettingsTargetYears(Number(e.target.value) || 0)
                    }
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Form.Group controlId="settingInflationStepUp">
                  <Form.Label className="small text-body-secondary mb-1">
                    Annual Inflation Step-Up (%)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    step="0.5"
                    value={settingsInflationStepUp}
                    onChange={(e) =>
                      setSettingsInflationStepUp(Number(e.target.value) || 0)
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-end mt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveSettings}
                className="px-3"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </Collapse>

        {/* Manual What-If Inputs Form */}
        {isManualMode && (
          <div className="mb-3 p-3 bg-body-secondary rounded border">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small fw-bold text-body-secondary text-uppercase tracking-wider">
                Simulation Inputs (What-If)
              </span>
              <Button
                variant="link"
                size="sm"
                className="p-0 text-decoration-none small"
                onClick={() => {
                  setManualBucket1(liveBucket1);
                  setManualBucket2(liveBucket2);
                  setManualMonthlySwp(dbMonthlySwp);
                }}
              >
                Reset to live values
              </Button>
            </div>
            <Row className="g-2">
              <Col xs={12} sm={4}>
                <Form.Group controlId="manualBucket1">
                  <Form.Label className="small text-body-secondary mb-1">
                    Bucket 1 (Short Term)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    value={manualBucket1}
                    onChange={(e) =>
                      setManualBucket1(Number(e.target.value) || 0)
                    }
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={4}>
                <Form.Group controlId="manualBucket2">
                  <Form.Label className="small text-body-secondary mb-1">
                    Bucket 2 (Long Term)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    value={manualBucket2}
                    onChange={(e) =>
                      setManualBucket2(Number(e.target.value) || 0)
                    }
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={4}>
                <Form.Group controlId="manualMonthlySwp">
                  <Form.Label className="small text-body-secondary mb-1">
                    Monthly SWP Amount
                  </Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    value={manualMonthlySwp}
                    onChange={(e) =>
                      setManualMonthlySwp(Number(e.target.value) || 0)
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        )}

        {/* Primary Verdict Banner */}
        <div className="mb-3">
          {result.refillNeeded ? (
            <Alert
              variant="warning"
              className="d-flex align-items-center mb-0 py-2 px-3 border shadow-none"
            >
              <BsExclamationTriangleFill className="text-warning me-3 fs-3 flex-shrink-0" />
              <div>
                <div className="fw-bold fs-6">Refill Recommended</div>
                <div className="small">
                  Transfer{" "}
                  <strong className="text-primary">
                    {toLocalCurrency(result.suggestedTransferAmount)}
                  </strong>{" "}
                  from Long Term → Short Term. Runway restores from{" "}
                  <strong>{runwayDisplay} yrs</strong> to{" "}
                  <strong>{projectedRunwayDisplay} yrs</strong> (
                  {activeTargetYears}-year target).
                </div>
              </div>
            </Alert>
          ) : (
            <Alert
              variant="success"
              className="d-flex align-items-center mb-0 py-2 px-3 border shadow-none"
            >
              <BsCheckCircleFill className="text-success me-3 fs-3 flex-shrink-0" />
              <div>
                <div className="fw-bold fs-6">No Refill Needed</div>
                <div className="small">
                  Bucket 1 holds <strong>{runwayDisplay} years</strong> of runway,
                  which is safely above the <strong>{activeTriggerYears}-year</strong> refill trigger.
                </div>
              </div>
            </Alert>
          )}
        </div>

        {/* Rule 7 Guardrail Alert */}
        {result.guardrailTriggered && (
          <Alert
            variant="info"
            className="d-flex align-items-center mb-3 py-2 px-3 border shadow-none"
          >
            <BsShieldExclamation className="text-info me-3 fs-4 flex-shrink-0" />
            <div className="small">
              <strong>Rule 7 Guardrail:</strong> {result.guardrailMessage} (Step-up: {dbInflationStepUp}%)
            </div>
          </Alert>
        )}

        {/* Metric Cards Row */}
        <Row className="g-2 mb-3">
          <Col xs={6} md={3}>
            <div className="p-2 border rounded bg-body-secondary text-center">
              <div className="text-body-secondary small">Current Runway</div>
              <div
                className={`fs-5 fw-bold ${
                  result.refillNeeded ? "text-warning" : "text-success"
                }`}
              >
                {runwayDisplay} <span className="small fw-normal">yrs</span>
              </div>
              <div className="small text-body-secondary" style={{ fontSize: "0.75rem" }}>
                Trigger: {activeTriggerYears} yrs
              </div>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="p-2 border rounded bg-body-secondary text-center">
              <div className="text-body-secondary small">Suggested Transfer</div>
              <div className="fs-5 fw-bold text-primary">
                {result.suggestedTransferAmount > 0
                  ? toLocalCurrency(result.suggestedTransferAmount)
                  : "—"}
              </div>
              <div className="small text-body-secondary" style={{ fontSize: "0.75rem" }}>
                Target: {activeTargetYears} yrs
              </div>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="p-2 border rounded bg-body-secondary text-center">
              <div className="text-body-secondary small">Runway Post-Refill</div>
              <div className="fs-5 fw-bold">
                {projectedRunwayDisplay} <span className="small fw-normal">yrs</span>
              </div>
              <div className="small text-body-secondary" style={{ fontSize: "0.75rem" }}>
                Capacity cap checked
              </div>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="p-2 border rounded bg-body-secondary text-center">
              <div className="text-body-secondary small">Annual Withdrawal Rate</div>
              <div className="fs-5 fw-bold">
                {result.withdrawalRateOnTotal.toFixed(2)}%
              </div>
              <div className="small text-body-secondary" style={{ fontSize: "0.75rem" }}>
                Benchmark: 3.50% SWR
              </div>
            </div>
          </Col>
        </Row>

        {/* Corpus Breakdown & Rule 7 Checkbox Footer */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
          <div className="d-flex align-items-center gap-3 small text-body-secondary flex-wrap">
            <span>
              Bucket 1 (ST):{" "}
              <strong className="text-body">
                {toLocalCurrency(activeBucket1)}
              </strong>
            </span>
            <span>
              Bucket 2 (LT):{" "}
              <strong className="text-body">
                {toLocalCurrency(activeBucket2)}
              </strong>
            </span>
            <span>
              Monthly SWP:{" "}
              <strong className="text-body">
                {toLocalCurrency(activeMonthlySwp)}
              </strong>
            </span>
          </div>

          <Form.Check
            type="checkbox"
            id="guardrail-negative-return-toggle"
            label={
              <span className="small">
                Bucket 2 had negative return this period (Rule 7)
              </span>
            }
            checked={bucket2HadNegativeReturn}
            onChange={(e) => setBucket2HadNegativeReturn(e.target.checked)}
            className="user-select-none mb-0"
          />
        </div>
      </Card.Body>
    </Card>
  );
};

export default BucketRefillAdvisor;
