import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import { AssetProjection, LiabilityProjection } from "@/infrastructure/db/db.types";
import {
  calculateEMI,
  calculateRemainingBalance,
} from "@/utils/financialUtils";
import { toLocalCurrency } from "@/utils/numberUtils";
import {
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
  Alert,
  Tabs,
  Tab,
} from "react-bootstrap";
import { BsPlus } from "react-icons/bs";
import {
  ProjectionData,
  LiabilityProjectionData,
  calculateProjectedValue,
  calculateProjectedBalance,
  calculateNetWorthXIRR,
  generateChartData,
} from "@/services/projectionService";
import { NetWorthChart } from "@/components/analytics/NetWorthChart";
import { AssetProjectionTable } from "@/components/analytics/AssetProjectionTable";
import { LiabilityProjectionTable } from "@/components/analytics/LiabilityProjectionTable";
import FormSelect from "@/components/common/FormSelect";

interface AssetFormData {
  newMonthlyInvestment: number;
  lumpsumExpected: number;
  redemptionExpected: number;
  comment: string;
  expectedReturns: number;
}

interface LiabilityFormData {
  // For existing loans
  liability_id?: number;
  // For future loans
  loanType_id?: number;
  loanAmount?: number;
  emi?: number;
  startDate?: string; // DD-MM-YYYY format
  totalMonths?: number;
  // Common fields
  prepaymentExpected: number;
  comment: string;
}

export default function AssetAllocationProjectionPage() {
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);
  const [projectionYears, setProjectionYears] = useState(2);
  const [isAddingFutureLoan, setIsAddingFutureLoan] = useState(false);

  // State for forms
  const [editingAssetRecord, setEditingAssetRecord] =
    useState<ProjectionData | null>(null);
  const [editingLiabilityRecord, setEditingLiabilityRecord] =
    useState<LiabilityProjectionData | null>(null);

  const [assetFormData, setAssetFormData] = useState<AssetFormData>({
    newMonthlyInvestment: 0,
    lumpsumExpected: 0,
    redemptionExpected: 0,
    comment: "",
    expectedReturns: 0,
  });

  const [liabilityFormData, setLiabilityFormData] = useState<LiabilityFormData>(
    {
      prepaymentExpected: 0,
      comment: "",
      loanType_id: 0,
      loanAmount: 0,
      emi: 0,
      startDate: "",
      totalMonths: 0,
    }
  );

  const [alert, setAlert] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);

  // Fetch config for inflation rate
  const userConfig =
    useLiveQuery(async () => {
      const configs = await db.configs.toArray();
      return configs.map((config) => ({
        [config.key]: config.value,
      }));
    })?.reduce((acc, curr) => ({ ...acc, ...curr }), {}) || {};

  const inflationRate = Number(userConfig["inflation-rate"]) || 6.5;

  // Fetch all required data
  const assetSubClasses = useLiveQuery(() => db.assetSubClasses.toArray());
  const assetsHoldings = useLiveQuery(() => db.assetsHoldings.toArray());
  const assetsProjection = useLiveQuery(() => db.assetsProjection.toArray());
  const liabilities = useLiveQuery(() => db.liabilities.toArray());
  const liabilitiesProjection = useLiveQuery(() =>
    db.liabilitiesProjection.toArray()
  );
  const loanTypes = useLiveQuery(() => db.loanTypes.toArray());

  // Auto-create liability projections for existing liabilities and clean up duplicates
  useEffect(() => {
    const createLiabilityProjections = async () => {
      if (!liabilities || !liabilitiesProjection) return;

      // Group projections by liability_id to find duplicates (only for existing liabilities, not future loans)
      const projectionsByLiability = new Map<
        number,
        typeof liabilitiesProjection
      >();
      for (const lp of liabilitiesProjection) {
        // Only process existing liability projections (those with liability_id)
        if (lp.liability_id !== undefined && lp.liability_id !== null) {
          if (!projectionsByLiability.has(lp.liability_id)) {
            projectionsByLiability.set(lp.liability_id, []);
          }
          projectionsByLiability.get(lp.liability_id)!.push(lp);
        }
      }

      // Remove duplicate projections, keeping only the one with the highest ID
      const duplicatesToDelete: number[] = [];
      for (const [, projections] of projectionsByLiability) {
        if (projections.length > 1) {
          // Sort by ID descending and keep the first (highest ID)
          projections.sort((a, b) => b.id - a.id);
          // Mark all except the first for deletion
          for (let i = 1; i < projections.length; i++) {
            duplicatesToDelete.push(projections[i].id);
          }
        }
      }

      // Delete duplicate projections
      if (duplicatesToDelete.length > 0) {
        await Promise.all(
          duplicatesToDelete.map((id) => db.liabilitiesProjection.delete(id))
        );
      }

      // Create missing projections
      const existingProjectionIds = new Set(
        Array.from(projectionsByLiability.keys())
      );

      const missingProjections = liabilities.filter(
        (liability) => !existingProjectionIds.has(liability.id)
      );

      if (missingProjections.length > 0) {
        const newProjections = missingProjections.map((liability) => ({
          id: undefined as unknown as number, // Will be auto-generated by Dexie
          liability_id: liability.id,
          newEmi: 0,
          prepaymentExpected: 0,
          comment: `Current: ${
            loanTypes?.find((lt) => lt.id === liability.loanType_id)?.name ||
            "Loan"
          }`,
        }));

        await db.liabilitiesProjection.bulkAdd(
          newProjections as LiabilityProjection[]
        );
      }
    };

    createLiabilityProjections();
  }, [liabilities, liabilitiesProjection, loanTypes]);

  // Combine data for display - Assets
  const assetProjectionData: ProjectionData[] | undefined = useLiveQuery(
    async () => {
      if (!assetSubClasses || !assetsHoldings || !assetsProjection) return [];

      const getAssetSubClass = (id: number) =>
        assetSubClasses.find((asc) => asc.id === id);

      const getCurrentAllocation = (assetSubClassId: number) =>
        assetsHoldings
          .filter((ah) => ah.assetSubClasses_id === assetSubClassId)
          .reduce((sum, ah) => sum + ah.existingAllocation, 0);

      const getCurrentMonthlyInvestment = (assetSubClassId: number) =>
        assetsHoldings
          .filter((ah) => ah.assetSubClasses_id === assetSubClassId)
          .reduce((sum, ah) => sum + (ah.sip || 0), 0);

      return assetsProjection
        .map((ap) => {
          const subClass = getAssetSubClass(ap.assetSubClasses_id);
          const currentAllocation = getCurrentAllocation(ap.assetSubClasses_id);
          const currentMonthlyInvestment = getCurrentMonthlyInvestment(
            ap.assetSubClasses_id
          );

          return {
            ...ap,
            assetSubClassName: subClass?.name || "Unknown",
            assetClasses_id: subClass?.assetClasses_id,
            expectedReturns: subClass?.expectedReturns || 0,
            currentAllocation,
            currentMonthlyInvestment,
            projectedValue: calculateProjectedValue(
              currentAllocation,
              ap.newMonthlyInvestment,
              ap.lumpsumExpected,
              ap.redemptionExpected,
              subClass?.expectedReturns || 0
            ),
          };
        })
        .sort((a, b) => {
          const catA = a.assetClasses_id || 0;
          const catB = b.assetClasses_id || 0;
          if (catA !== catB) return catA - catB;
          return b.currentAllocation - a.currentAllocation;
        });
    },
    [assetSubClasses, assetsHoldings, assetsProjection],
    []
  );

  // Combine data for display - Liabilities
  const liabilityProjectionData: LiabilityProjectionData[] = useLiveQuery(
    async () => {
      if (!liabilities || !liabilitiesProjection || !loanTypes) return [];

      const getLiability = (id: number) => liabilities.find((l) => l.id === id);
      const getLoanType = (id: number) => loanTypes.find((lt) => lt.id === id);

      // Separate existing liability projections and future loans
      const existingProjections = liabilitiesProjection.filter(
        (lp) => lp.liability_id !== undefined && lp.liability_id !== null
      );
      const futureLoans = liabilitiesProjection.filter(
        (lp) => lp.liability_id === undefined || lp.liability_id === null
      );

      // Deduplicate existing projections
      const projectionMap = new Map<
        number,
        (typeof liabilitiesProjection)[0]
      >();
      for (const lp of existingProjections) {
        if (lp.liability_id !== undefined) {
          const existing = projectionMap.get(lp.liability_id);
          if (!existing || lp.id > existing.id) {
            projectionMap.set(lp.liability_id, lp);
          }
        }
      }

      // Process existing liability projections
      const existingData = Array.from(projectionMap.values()).map((lp) => {
        const liability =
          lp.liability_id !== undefined && lp.liability_id !== null
            ? getLiability(lp.liability_id)
            : null;
        const loanType = liability ? getLoanType(liability.loanType_id) : null;

        const currentBalance =
          liability && loanType
            ? calculateRemainingBalance(
                liability.loanAmount,
                loanType.interestRate,
                liability.totalMonths,
                liability.loanStartDate
              )
            : 0;

        const currentEmi =
          liability && loanType
            ? calculateEMI(
                liability.loanAmount,
                loanType.interestRate,
                liability.totalMonths
              )
            : 0;

        return {
          ...lp,
          loanTypeName: loanType?.name || "Unknown",
          interestRate: loanType?.interestRate || 0,
          currentBalance,
          currentEmi,
          isFutureLoan: false,
          projectedBalance: calculateProjectedBalance(
            currentBalance,
            currentEmi,
            0,
            lp.prepaymentExpected,
            loanType?.interestRate || 0
          ),
        };
      });

      // Process future loans
      const futureData = futureLoans.map((lp) => {
        const loanType =
          lp.loanType_id !== undefined && lp.loanType_id !== null
            ? getLoanType(lp.loanType_id)
            : null;
        const loanAmount = lp.loanAmount || 0;
        const emi =
          loanAmount && loanType && lp.totalMonths
            ? calculateEMI(loanAmount, loanType.interestRate, lp.totalMonths)
            : 0;

        let currentBalance = 0;
        if (lp.startDate) {
          const [day, month, year] = lp.startDate.split("-").map(Number);
          const start = new Date(year, month - 1, day);
          if (start <= new Date()) {
            currentBalance = calculateRemainingBalance(
              loanAmount,
              loanType?.interestRate || 0,
              lp.totalMonths || 0,
              lp.startDate
            );
          }
        }

        return {
          ...lp,
          loanTypeName: loanType?.name || "Unknown",
          interestRate: loanType?.interestRate || 0,
          currentBalance,
          currentEmi: emi,
          isFutureLoan: true,
          projectedBalance: calculateProjectedBalance(
            currentBalance > 0 ? currentBalance : loanAmount,
            emi,
            0,
            lp.prepaymentExpected,
            loanType?.interestRate || 0,
            lp.startDate
          ),
        };
      });

      return [...existingData, ...futureData].sort((a, b) => {
        const catA = a.loanType_id || 0;
        const catB = b.loanType_id || 0;
        if (catA !== catB) return catA - catB;
        return b.currentBalance - a.currentBalance;
      });
    },
    [liabilities, liabilitiesProjection, loanTypes],
    []
  );

  // Handlers
  const handleEditAsset = (record: ProjectionData) => {
    setEditingAssetRecord(record);
    setAssetFormData({
      newMonthlyInvestment: record.newMonthlyInvestment,
      lumpsumExpected: record.lumpsumExpected,
      redemptionExpected: record.redemptionExpected,
      comment: record.comment || "",
      expectedReturns: record.expectedReturns || 0,
    });
    setShowAssetModal(true);
  };

  const [newAssetSubClassId, setNewAssetSubClassId] = useState<number>(0);

  const handleSaveAsset = async () => {
    try {
      const { expectedReturns, ...projectionData } = assetFormData;

      if (editingAssetRecord) {
        await db.assetsProjection.update(editingAssetRecord.id, projectionData);
        await db.assetSubClasses.update(editingAssetRecord.assetSubClasses_id, {
          expectedReturns,
        });
        setAlert({ type: "success", message: "Asset projection updated" });
      } else {
        if (!newAssetSubClassId) {
          setAlert({ type: "danger", message: "Please select an asset class" });
          return;
        }
        await db.assetsProjection.add({
          assetSubClasses_id: newAssetSubClassId,
          ...projectionData,
        } as AssetProjection);
        await db.assetSubClasses.update(newAssetSubClassId, {
          expectedReturns,
        });
        setAlert({ type: "success", message: "Asset projection added" });
      }
      setShowAssetModal(false);
      setEditingAssetRecord(null);
      setAssetFormData({
        newMonthlyInvestment: 0,
        lumpsumExpected: 0,
        redemptionExpected: 0,
        comment: "",
        expectedReturns: 0,
      });
      setNewAssetSubClassId(0);
    } catch (error) {
      console.error(error);
      setAlert({ type: "danger", message: "Failed to save asset projection" });
    }
  };

  const handleDeleteAssetProjection = async (id: number) => {
    if (confirm("Are you sure you want to delete this projection?")) {
      await db.assetsProjection.delete(id);
    }
  };

  const handleEditLiability = (record: LiabilityProjectionData) => {
    setEditingLiabilityRecord(record);
    setIsAddingFutureLoan(record.isFutureLoan || false);
    setLiabilityFormData({
      liability_id: record.liability_id,
      loanType_id: record.loanType_id || 0,
      loanAmount: record.loanAmount || 0,
      emi: record.currentEmi || 0,
      startDate: record.startDate || "",
      totalMonths: record.totalMonths || 0,
      prepaymentExpected: record.prepaymentExpected,
      comment: record.comment || "",
    });
    setShowLiabilityModal(true);
  };

  const handleAddLiability = () => {
    setEditingLiabilityRecord(null);
    setIsAddingFutureLoan(false); // Default to existing tab
    setLiabilityFormData({
      prepaymentExpected: 0,
      comment: "",
      loanType_id: 0,
      loanAmount: 0,
      emi: 0,
      startDate: "",
      totalMonths: 0,
    });
    setShowLiabilityModal(true);
  };

  const handleSaveLiability = async () => {
    try {
      if (editingLiabilityRecord) {
        // Remove fields that shouldn't be in LiabilityProjection
        const { emi, ...dataToSave } = liabilityFormData;
        await db.liabilitiesProjection.update(
          editingLiabilityRecord.id,
          dataToSave as any
        );
        setAlert({ type: "success", message: "Liability projection updated" });
      } else {
        // Add New
        if (isAddingFutureLoan) {
          // Future Loan
          if (
            !liabilityFormData.loanType_id ||
            !liabilityFormData.loanAmount ||
            !liabilityFormData.startDate
          ) {
            setAlert({
              type: "danger",
              message: "Please fill required fields for future loan",
            });
            return;
          }
          const { emi, ...dataToSave } = liabilityFormData;
          await db.liabilitiesProjection.add({
            ...dataToSave,
            liability_id: undefined, // Ensure it's undefined for future
          } as unknown as LiabilityProjection);
        } else {
          // Existing Loan Projection
          if (!liabilityFormData.liability_id) {
            setAlert({ type: "danger", message: "Please select a liability" });
            return;
          }
          const { emi, ...dataToSave } = liabilityFormData;
          await db.liabilitiesProjection.add({
            ...dataToSave,
            // Clear future fields just in case
            loanType_id: undefined,
            loanAmount: undefined,
            startDate: undefined,
            totalMonths: undefined,
          } as unknown as LiabilityProjection);
        }
        setAlert({ type: "success", message: "Liability projection added" });
      }
      setShowLiabilityModal(false);
      setEditingLiabilityRecord(null);
    } catch (error) {
      console.error(error);
      setAlert({
        type: "danger",
        message: "Failed to save liability projection",
      });
    }
  };

  const handleDeleteLiabilityProjection = async (id: number) => {
    if (confirm("Are you sure you want to delete this projection?")) {
      await db.liabilitiesProjection.delete(id);
    }
  };

  const totalCurrentAssets =
    assetProjectionData?.reduce((sum, item) => sum + item.currentAllocation, 0) ||
    0;

  const totalProjectedAssets =
    assetProjectionData?.reduce((sum, item) => sum + item.projectedValue, 0) || 0;

  const totalCurrentLiabilities =
    liabilityProjectionData?.reduce(
      (sum, item) => sum + item.currentBalance,
      0
    ) || 0;

  const totalProjectedLiabilities =
    liabilityProjectionData?.reduce(
      (sum, item) => sum + item.projectedBalance,
      0
    ) || 0;

  const currentNetWorth = totalCurrentAssets - totalCurrentLiabilities;
  const projectedNetWorth = totalProjectedAssets - totalProjectedLiabilities;
  const netWorthGrowth = projectedNetWorth - currentNetWorth;
  const netWorthGrowthPercentage =
    currentNetWorth > 0 ? (netWorthGrowth / currentNetWorth) * 100 : 0;

  const xirrValue = calculateNetWorthXIRR(
    currentNetWorth,
    projectedNetWorth,
    assetProjectionData || [],
    liabilityProjectionData || []
  );

  const chartData = generateChartData(
    projectionYears,
    assetProjectionData,
    liabilityProjectionData,
    inflationRate
  );

  return (
    <div className="flex-grow-1 overflow-auto container-fluid">
      {alert && (
        <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                  <BsPlus size={24} className="text-primary" />
                </div>
                <div>
                  <div className="text-muted small">Current Net Worth</div>
                  <h5 className="mb-0 fw-bold text-success fs-6">
                    {toLocalCurrency(currentNetWorth)}
                  </h5>
                </div>
              </div>
              <div className="small text-muted">
                Assets:{" "}
                <span className="fw-bold text-success fs-6">
                  {toLocalCurrency(totalCurrentAssets)}
                </span>{" "}
                | Liabilities:{" "}
                <span className="fw-bold text-danger fs-6">
                  {toLocalCurrency(totalCurrentLiabilities)}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <div className="bg-success bg-opacity-10 rounded p-2 me-3">
                  <BsPlus size={24} className="text-success" />
                </div>
                <div>
                  <div className="text-muted small">
                    Projected Net Worth (1 Year)
                  </div>
                  <h5 className="mb-0 fw-bold text-success fs-6">
                    {toLocalCurrency(projectedNetWorth)}
                  </h5>
                </div>
              </div>
              <div className="small text-muted">
                Assets:{" "}
                <span className="fw-bold text-success fs-6">
                  {toLocalCurrency(totalProjectedAssets)}
                </span>{" "}
                | Liabilities:{" "}
                <span className="fw-bold text-danger fs-6">
                  {toLocalCurrency(totalProjectedLiabilities)}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <div
                  className={`${
                    netWorthGrowth >= 0 ? "bg-success" : "bg-danger"
                  } bg-opacity-10 rounded p-2 me-3`}
                >
                  <BsPlus
                    size={24}
                    className={
                      netWorthGrowth >= 0 ? "text-success" : "text-danger"
                    }
                  />
                </div>
                <div>
                  <div className="text-muted small">
                    Growth Metrics (1 Year)
                  </div>
                  <div className="d-flex flex-column">
                    <div className="mb-1">
                      <span className="text-muted small me-2">XIRR:</span>
                      <span className="fw-bold text-success fs-6">
                        {xirrValue.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted small me-2">CAGR:</span>
                      <span className="fw-bold text-success fs-6">
                        {netWorthGrowthPercentage.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="small text-muted mt-2 border-top pt-2">
                Absolute Growth: {toLocalCurrency(netWorthGrowth)}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Chart */}
      <NetWorthChart
        chartData={chartData}
        projectionYears={projectionYears}
        setProjectionYears={setProjectionYears}
      />

      <Row>
        {/* Asset Projections */}
        <Col md={12} className="mb-4">
          <AssetProjectionTable
            data={assetProjectionData || []}
            totalCurrentAssets={totalCurrentAssets}
            totalProjectedAssets={totalProjectedAssets}
            onEdit={handleEditAsset}
            onDelete={handleDeleteAssetProjection}
            onAdd={() => {
              setEditingAssetRecord(null);
              setAssetFormData({
                newMonthlyInvestment: 0,
                lumpsumExpected: 0,
                redemptionExpected: 0,
                comment: "",
                expectedReturns: 0,
              });
              setNewAssetSubClassId(0);
              setShowAssetModal(true);
            }}
            assetSubClasses={assetSubClasses}
          />
        </Col>

        {/* Liability Projections */}
        <Col md={12}>
          <LiabilityProjectionTable
            data={liabilityProjectionData || []}
            totalCurrentLiabilities={totalCurrentLiabilities}
            totalProjectedLiabilities={totalProjectedLiabilities}
            onEdit={handleEditLiability}
            onDelete={handleDeleteLiabilityProjection}
            onAdd={handleAddLiability}
            liabilities={liabilities}
            loanTypes={loanTypes}
          />
        </Col>
      </Row>

      {/* Asset Modal */}
      <Modal show={showAssetModal} onHide={() => setShowAssetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingAssetRecord ? "Edit" : "Add"} Asset Projection
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {!editingAssetRecord && (
              <FormSelect
                label="Asset Sub Class"
                value={newAssetSubClassId}
                onChange={(e) => setNewAssetSubClassId(Number(e.target.value))}
                options={assetSubClasses || []}
                defaultText="Select Asset Sub Class"
              />
            )}
            <Form.Group className="mb-3">
              <Form.Label>New Monthly Investment (SIP)</Form.Label>
              <Form.Control
                type="number"
                value={assetFormData.newMonthlyInvestment}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    newMonthlyInvestment: Number(e.target.value),
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Expected Annual Lumpsum</Form.Label>
              <Form.Control
                type="number"
                value={assetFormData.lumpsumExpected}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    lumpsumExpected: Number(e.target.value),
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Expected Redemption (One-time)</Form.Label>
              <Form.Control
                type="number"
                value={assetFormData.redemptionExpected}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    redemptionExpected: Number(e.target.value),
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Expected Returns (Annual %)</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={assetFormData.expectedReturns}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    expectedReturns: Number(e.target.value),
                  })
                }
              />
              <Form.Text className="text-muted">
                This will update the global expected return for this asset
                class.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Comment</Form.Label>
              <Form.Control
                type="text"
                value={assetFormData.comment}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    comment: e.target.value,
                  })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowAssetModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveAsset}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Liability Modal */}
      <Modal
        show={showLiabilityModal}
        onHide={() => setShowLiabilityModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingLiabilityRecord ? "Edit" : "Add"} Liability Projection
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs
            activeKey={isAddingFutureLoan ? "future" : "existing"}
            onSelect={(k) => setIsAddingFutureLoan(k === "future")}
            className="mb-3"
          >
            <Tab
              eventKey="existing"
              title="Existing Loan"
              disabled={!!editingLiabilityRecord && isAddingFutureLoan}
            >
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Select Liability</Form.Label>
                  <Form.Select
                    value={liabilityFormData.liability_id || ""}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        liability_id: Number(e.target.value),
                      })
                    }
                    disabled={!!editingLiabilityRecord}
                  >
                    <option value="">Select...</option>
                    {liabilities?.map((l) => {
                      const type = loanTypes?.find(
                        (t) => t.id === l.loanType_id
                      );
                      return (
                        <option key={l.id} value={l.id}>
                          {type?.name} ({toLocalCurrency(l.loanAmount)})
                        </option>
                      );
                    })}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Annual Prepayment</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.prepaymentExpected}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        prepaymentExpected: Number(e.target.value),
                      })
                    }
                  />
                </Form.Group>
              </Form>
            </Tab>
            <Tab
              eventKey="future"
              title="Future Loan"
              disabled={!!editingLiabilityRecord && !isAddingFutureLoan}
            >
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Loan Type</Form.Label>
                  <Form.Select
                    value={liabilityFormData.loanType_id || ""}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        loanType_id: Number(e.target.value),
                      })
                    }
                  >
                    <option value="">Select...</option>
                    {loanTypes?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.interestRate}%)
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Loan Amount</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.loanAmount}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        loanAmount: Number(e.target.value),
                      })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={liabilityFormData.startDate}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        startDate: e.target.value,
                      })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Tenure (Months)</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.totalMonths}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        totalMonths: Number(e.target.value),
                      })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Annual Prepayment</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.prepaymentExpected}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        prepaymentExpected: Number(e.target.value),
                      })
                    }
                  />
                </Form.Group>
              </Form>
            </Tab>
          </Tabs>

          <Form.Group className="mb-3 mt-3">
            <Form.Label>Comment</Form.Label>
            <Form.Control
              type="text"
              value={liabilityFormData.comment}
              onChange={(e) =>
                setLiabilityFormData({
                  ...liabilityFormData,
                  comment: e.target.value,
                })
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowLiabilityModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveLiability}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
