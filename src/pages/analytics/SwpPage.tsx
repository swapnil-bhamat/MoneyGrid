import {
  Row,
  Col,
  Table,
  Card,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {
  BsGraphUp,
  BsInfoCircle,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsWallet2,
  BsCashCoin,
  BsCalendar3,
} from "react-icons/bs";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import { useSharedDashboardData } from "@/contexts/DashboardDataContext";
import { toLocalCurrency, getActiveCurrency } from "@/utils/numberUtils";
import { t } from "@/utils/localization";
import { FINANCIAL_CATEGORIES } from "@/utils/constants";

const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const SwpPage: React.FC = () => {
  const userConfig =
    useLiveQuery(async () => {
      const configs = await db.configs.toArray();
      return configs.map((config) => ({
        [config.key]: config.value,
      }));
    })?.reduce((acc, curr) => ({ ...acc, ...curr }), {}) || {};

  const dob = String(userConfig["date-of-birth"]); // Format: DD-MM-YYYY
  const age = dob
    ? Math.floor(
        (new Date().getTime() -
          new Date(dob.split("-").reverse().join("-")).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      )
    : 35;

  const inflationRate = Number(userConfig["inflation-rate"]) || 6.5;
  const lifeExpectancy = Number(userConfig["life-expectancy"] || 100);

  const { withPercentage, assetAllocationByBucket } = useSharedDashboardData();
  const needPerMonth =
    withPercentage.find(
      (a) => a?.type === FINANCIAL_CATEGORIES.NEED || a?.id === capitalize(FINANCIAL_CATEGORIES.NEED)
    )?.value ?? 0;
  const shortTermBucketValue =
    assetAllocationByBucket.filter((a) => a?.label === "Short Term")[0]
      ?.value ?? 0;
  const longTermBucketValue =
    assetAllocationByBucket.filter((a) => a?.label === "Long Term")[0]?.value ??
    0;
  const totalAllocatedValue = shortTermBucketValue + longTermBucketValue;
  const swpValuePerYear = Math.floor(totalAllocatedValue * 0.035);
  const swpValuePerMonth = Math.floor(swpValuePerYear / 12);
  const gapPerMonth = needPerMonth - swpValuePerMonth;

  const shortTermBucketCorpusRequired = swpValuePerYear * 5;
  const longTermBucketCorpusRequired =
    totalAllocatedValue - shortTermBucketCorpusRequired;

  const swpParams = {
    age,
    inflationRate,
    lifeExpectancy,
    totalAllocatedValue,
    swpValuePerYear,
    swpValuePerMonth,
    gapPerMonth,
    shortTermBucketValue,
    shortTermBucketCorpusRequired,
    longTermBucketValue,
    longTermBucketCorpusRequired,
    avgShortTermXIRR: 6,
    avgLongTermXIRR: 12,
  };

  const activeCurrency = getActiveCurrency();

  // ---------------- Projection Table Logic ----------------
  type ProjectionRow = {
    year: number;
    age: number;
    yearlyNeed: number;
    withdrawal: number;
    shortTermBucket: number;
    longTermBucket: number;
    depleted: boolean;
    status: "Covered" | "Partial" | "Corpus Exhausted";
  };

  const generateProjections = (): ProjectionRow[] => {
    const rows: ProjectionRow[] = [];
    let st = swpParams.shortTermBucketValue;
    let lt = swpParams.longTermBucketValue;
    let depletedFlag = false;

    for (let y = 0; y <= swpParams.lifeExpectancy - swpParams.age; y++) {
      const currentAge = swpParams.age + y;
      const yearlyNeed =
        swpParams.swpValuePerYear * (1 + swpParams.inflationRate / 100) ** y;

      // Step 1: Withdraw from Short-Term
      let withdrawal = Math.min(st, yearlyNeed);
      st -= withdrawal;

      // Step 2: If Shortfall, cover from Long-Term immediately
      if (withdrawal < yearlyNeed && lt > 0) {
        const refill = Math.min(lt, yearlyNeed - withdrawal);
        withdrawal += refill;
        lt -= refill;
      }

      // Step 3: Rebalancing (maintain 5x yearly need in ST if possible)
      const requiredST = yearlyNeed * 5;
      if (st < requiredST && lt > 0) {
        const transfer = Math.min(lt, requiredST - st);
        st += transfer;
        lt -= transfer;
      }

      // Optional: If ST > requiredST, move some back to LT
      if (st > requiredST) {
        const excess = st - requiredST;
        st -= excess;
        lt += excess;
      }

      // Step 4: Apply growth for next year
      if (st > 0) st = st * (1 + swpParams.avgShortTermXIRR / 100);
      if (lt > 0) lt = lt * (1 + swpParams.avgLongTermXIRR / 100);

      // Step 5: Check depletion
      if (!depletedFlag && st <= 0 && lt <= 0) {
        depletedFlag = true;
      }

      let status: ProjectionRow["status"] = "Covered";
      if (withdrawal < yearlyNeed) status = "Partial";
      if (depletedFlag) status = "Corpus Exhausted";

      rows.push({
        year: y,
        age: currentAge,
        yearlyNeed: Math.round(yearlyNeed),
        withdrawal: Math.round(withdrawal),
        shortTermBucket: Math.max(0, Math.round(st)),
        longTermBucket: Math.max(0, Math.round(lt)),
        depleted: depletedFlag,
        status,
      });

      if (depletedFlag) break;
    }
    return rows;
  };

  const projections = generateProjections();
  const lastProjection = projections[projections.length - 1];
  const totalWithdrawals = projections.reduce(
    (sum, r) => sum + r.withdrawal,
    0
  );

  const sustainabilityMessage = !lastProjection?.depleted
    ? `Portfolio sustains till age ${swpParams.lifeExpectancy}`
    : `Corpus runs out at age ${lastProjection.age}`;

  return (
    <div className="py-2 px-2">
      {/* Rebalancing Overview */}
      <Row className="mb-3">
        <Col xs={12} md={8} lg={8} className="mb-2">
          <Card>
            <Card.Header className="py-2">
              <BsInfoCircle className="me-2" />
              <span className="d-none d-sm-inline">Parameters Considered</span>
              <span className="d-sm-none">Parameters</span>
            </Card.Header>
            <Card.Body className="py-2">
              <Row className="g-2">
                <Col xs={12} sm={6} md={4} className="mb-2">
                  <div className="d-flex align-items-center">
                    <BsCalendar3 className="me-2 text-primary flex-shrink-0" />
                    <span className="small">
                      Age: <strong>{swpParams.age}</strong>
                    </span>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={4} className="mb-2">
                  <div className="d-flex align-items-center">
                    <BsCalendar3 className="me-2 text-primary flex-shrink-0" />
                    <span className="small">
                      Life Exp: <strong>{swpParams.lifeExpectancy}</strong> yrs
                    </span>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={4} className="mb-2">
                  <div className="d-flex align-items-center">
                    <BsCashCoin className="me-2 text-success flex-shrink-0" />
                    <span className="small">
                      Inflation: <strong>{swpParams.inflationRate}%</strong>
                    </span>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={4} className="mb-2">
                  <OverlayTrigger
                    overlay={<Tooltip>Safe Withdrawal Rate</Tooltip>}
                  >
                    <div className="d-flex align-items-center">
                      <BsWallet2 className="me-2 text-warning flex-shrink-0" />
                      <span className="small">
                        SWR: <strong>3.5%</strong>
                      </span>
                    </div>
                  </OverlayTrigger>
                </Col>
                <Col xs={12} sm={6} md={4} className="mb-2">
                  <div className="d-flex align-items-center">
                    <BsGraphUp className="me-2 text-success flex-shrink-0" />
                    <span className="small">
                      ST XIRR: <strong>{swpParams.avgShortTermXIRR}%</strong>
                    </span>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={4} className="mb-2">
                  <div className="d-flex align-items-center">
                    <BsGraphUp className="me-2 text-success flex-shrink-0" />
                    <span className="small">
                      LT XIRR: <strong>{swpParams.avgLongTermXIRR}%</strong>
                    </span>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4} lg={4}>
          <Card>
            <Card.Header className="py-2">
              <BsGraphUp className="me-2" />
              <span className="d-none d-sm-inline">Sustainability Summary</span>
              <span className="d-sm-none">Summary</span>
            </Card.Header>
            <Card.Body className="py-2">
              <Row className="g-2">
                <Col xs={12} md={6}>
                  {!lastProjection?.depleted ? (
                    <div className="text-success mb-2">
                      <BsCheckCircleFill className="me-2" />
                      <span className="small fw-bold">
                        {sustainabilityMessage}
                      </span>
                    </div>
                  ) : (
                    <div className="text-danger mb-2">
                      <BsExclamationTriangleFill className="me-2" />
                      <span className="small fw-bold">
                        {sustainabilityMessage}
                      </span>
                    </div>
                  )}
                </Col>
                <Col xs={12} md={6}>
                  <div className="small">
                    Total Withdrawals:{" "}
                    <strong>{toLocalCurrency(totalWithdrawals)}</strong>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Sustainability Summary */}
      <Row className="mb-3">
        <Col xs={12} className="mb-2">
          <Card>
            <Card.Header className="py-2">
              <BsWallet2 className="me-2" />
              <span className="d-none d-sm-inline">Rebalancing Overview</span>
              <span className="d-sm-none">Rebalancing</span>
            </Card.Header>
            <Card.Body className="p-0">
              {/* Mobile Card View */}
              <div className="d-md-none">
                <div className="p-3 border-bottom">
                  <div className="fw-bold mb-2">Need vs SWP (Monthly)</div>
                  <div className="row g-2 small">
                    <div className="col-4 text-body-secondary">Current:</div>
                    <div className="col-8">{toLocalCurrency(needPerMonth)}</div>
                    <div className="col-4 text-body-secondary">Required:</div>
                    <div className="col-8">
                      {toLocalCurrency(swpParams.swpValuePerMonth)}
                    </div>
                    <div className="col-4 text-body-secondary">Gap:</div>
                    <div className="col-8">{toLocalCurrency(gapPerMonth)}</div>
                    <div className="col-4 text-body-secondary">Status:</div>
                    <div className="col-8">
                      {gapPerMonth > 0 ? (
                        <span className="text-danger small">
                          <BsExclamationTriangleFill /> Shortfall
                        </span>
                      ) : (
                        <span className="text-success small">
                          <BsCheckCircleFill /> Covered
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 border-bottom">
                  <div className="fw-bold mb-2">Short-Term Bucket</div>
                  <div className="row g-2 small">
                    <div className="col-4 text-body-secondary">Current:</div>
                    <div className="col-8">
                      {toLocalCurrency(swpParams.shortTermBucketValue)}
                    </div>
                    <div className="col-4 text-body-secondary">Required:</div>
                    <div className="col-8">
                      {toLocalCurrency(swpParams.shortTermBucketCorpusRequired)}
                    </div>
                    <div className="col-4 text-body-secondary">Gap:</div>
                    <div className="col-8">
                      {toLocalCurrency(
                        swpParams.shortTermBucketValue -
                          swpParams.shortTermBucketCorpusRequired
                      )}
                    </div>
                    <div className="col-4 text-body-secondary">Status:</div>
                    <div className="col-8">
                      {swpParams.shortTermBucketValue <
                      swpParams.shortTermBucketCorpusRequired ? (
                        <span className="text-danger small">
                          <BsExclamationTriangleFill /> Needs Rebalancing
                        </span>
                      ) : (
                        <span className="text-success small">
                          <BsCheckCircleFill /> Adequate
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <div className="fw-bold mb-2">Long-Term Bucket</div>
                  <div className="row g-2 small">
                    <div className="col-4 text-body-secondary">Current:</div>
                    <div className="col-8">
                      {toLocalCurrency(swpParams.longTermBucketValue)}
                    </div>
                    <div className="col-4 text-body-secondary">Required:</div>
                    <div className="col-8">
                      {toLocalCurrency(swpParams.longTermBucketCorpusRequired)}
                    </div>
                    <div className="col-4 text-body-secondary">Gap:</div>
                    <div className="col-8">
                      {toLocalCurrency(
                        swpParams.longTermBucketValue -
                          swpParams.longTermBucketCorpusRequired
                      )}
                    </div>
                    <div className="col-4 text-body-secondary">Status:</div>
                    <div className="col-8">
                      {swpParams.longTermBucketValue <
                      swpParams.longTermBucketCorpusRequired ? (
                        <span className="text-danger small">
                          <BsExclamationTriangleFill /> Needs Rebalancing
                        </span>
                      ) : (
                        <span className="text-success small">
                          <BsCheckCircleFill /> Adequate
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="d-none d-md-block table-responsive">
                <Table striped bordered hover className="mb-0">
                  <thead className="table-dark">
                    <tr>
                      <th>Metric</th>
                      <th>Current</th>
                      <th>Required</th>
                      <th>{t.goals.gap}</th>
                      <th>{t.common.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Need vs SWP (Monthly)</td>
                      <td>{toLocalCurrency(needPerMonth)}</td>
                      <td>{toLocalCurrency(swpParams.swpValuePerMonth)}</td>
                      <td>{toLocalCurrency(gapPerMonth)}</td>
                      <td>
                        {gapPerMonth > 0 ? (
                          <span className="text-danger">
                            <BsExclamationTriangleFill /> Shortfall
                          </span>
                        ) : (
                          <span className="text-success">
                            <BsCheckCircleFill /> Covered
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Short-Term Bucket</td>
                      <td>{toLocalCurrency(swpParams.shortTermBucketValue)}</td>
                      <td>
                        {toLocalCurrency(
                          swpParams.shortTermBucketCorpusRequired
                        )}
                      </td>
                      <td>
                        {toLocalCurrency(
                          swpParams.shortTermBucketValue -
                            swpParams.shortTermBucketCorpusRequired
                        )}
                      </td>
                      <td>
                        {swpParams.shortTermBucketValue <
                        swpParams.shortTermBucketCorpusRequired ? (
                          <span className="text-danger">
                            <BsExclamationTriangleFill /> Needs Rebalancing
                          </span>
                        ) : (
                          <span className="text-success">
                            <BsCheckCircleFill /> Adequate
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Long-Term Bucket</td>
                      <td>{toLocalCurrency(swpParams.longTermBucketValue)}</td>
                      <td>
                        {toLocalCurrency(
                          swpParams.longTermBucketCorpusRequired
                        )}
                      </td>
                      <td>
                        {toLocalCurrency(
                          swpParams.longTermBucketValue -
                            swpParams.longTermBucketCorpusRequired
                        )}
                      </td>
                      <td>
                        {swpParams.longTermBucketValue <
                        swpParams.longTermBucketCorpusRequired ? (
                          <span className="text-danger">
                            <BsExclamationTriangleFill /> Needs Rebalancing
                          </span>
                        ) : (
                          <span className="text-success">
                            <BsCheckCircleFill /> Adequate
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Projection Table */}
      <Row>
        <Col xs={12}>
          <h5 className="mb-2">Projection Table</h5>

          {/* Mobile Card View */}
          <div className="d-lg-none">
            {projections.slice(0, 10).map((row, idx) => (
              <Card
                key={row.year}
                className={`mb-2 ${
                  row.depleted
                    ? "border-danger"
                    : idx === projections.length - 1
                    ? "border-secondary"
                    : ""
                }`}
              >
                <Card.Body className="py-2 px-3">
                  <div className="row g-1 small">
                    <div className="col-6">
                      <strong>
                        Year {row.year} (Age {row.age})
                      </strong>
                    </div>
                    <div className="col-6 text-end">
                      {row.status === "Covered" && (
                        <span className="text-success small">
                          <BsCheckCircleFill className="me-1" /> Covered
                        </span>
                      )}
                      {row.status === "Partial" && (
                        <span className="text-warning small">
                          <BsExclamationTriangleFill className="me-1" /> Partial
                        </span>
                      )}
                      {row.status === "Corpus Exhausted" && (
                        <span className="text-danger small">
                          <BsExclamationTriangleFill className="me-1" />{" "}
                          Exhausted
                        </span>
                      )}
                    </div>
                    <div className="col-6 text-body-secondary">Need:</div>
                    <div className="col-6">
                      {toLocalCurrency(row.yearlyNeed)}
                    </div>
                    <div className="col-6 text-body-secondary">Withdrawal:</div>
                    <div className="col-6">
                      {toLocalCurrency(row.withdrawal)}
                    </div>
                    <div className="col-6 text-body-secondary">ST Bucket:</div>
                    <div className="col-6">
                      {toLocalCurrency(row.shortTermBucket)}
                    </div>
                    <div className="col-6 text-body-secondary">LT Bucket:</div>
                    <div className="col-6">
                      {toLocalCurrency(row.longTermBucket)}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
            {projections.length > 10 && (
              <div className="text-center text-body-secondary small mt-2">
                Showing first 10 years. View on desktop for complete table.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="d-none d-lg-block table-responsive">
            <Table striped bordered hover size="sm">
              <thead className="table-dark">
                <tr>
                  <th>Year</th>
                  <th>Age</th>
                  <th>Yearly Need ({activeCurrency.symbol})</th>
                  <th>Withdrawal ({activeCurrency.symbol})</th>
                  <th>Short Term Bucket ({activeCurrency.symbol})</th>
                  <th>Long Term Bucket ({activeCurrency.symbol})</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((row, idx) => (
                  <tr
                    key={row.year}
                    className={
                      row.depleted
                        ? "table-danger"
                        : idx === projections.length - 1
                        ? "table-secondary"
                        : ""
                    }
                  >
                    <td>{row.year}</td>
                    <td>{row.age}</td>
                    <td>{toLocalCurrency(row.yearlyNeed)}</td>
                    <td>{toLocalCurrency(row.withdrawal)}</td>
                    <td>{toLocalCurrency(row.shortTermBucket)}</td>
                    <td>{toLocalCurrency(row.longTermBucket)}</td>
                    <td>
                      {row.status === "Covered" && (
                        <span className="text-success">
                          <BsCheckCircleFill className="me-1" /> Covered
                        </span>
                      )}
                      {row.status === "Partial" && (
                        <span className="text-warning">
                          <BsExclamationTriangleFill className="me-1" /> Partial
                        </span>
                      )}
                      {row.status === "Corpus Exhausted" && (
                        <span className="text-danger">
                          <BsExclamationTriangleFill className="me-1" /> Corpus
                          Exhausted
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default SwpPage;
