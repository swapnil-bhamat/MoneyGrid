import React from "react";
import { Card, Table, Button } from "react-bootstrap";
import { BsPlus, BsPencil, BsTrash } from "react-icons/bs";
import { toLocalCurrency } from "@/utils/numberUtils";
import { ProjectionData } from "@/services/projectionService";
import { AssetSubClass } from "@/infrastructure/db/db.types";
import { getDynamicBgClass } from "@/utils/colorUtils";

interface AssetProjectionTableProps {
  data: ProjectionData[];
  totalCurrentAssets: number;
  totalProjectedAssets: number;
  onEdit: (item: ProjectionData) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  assetSubClasses: AssetSubClass[] | undefined;
}

export const AssetProjectionTable: React.FC<AssetProjectionTableProps> = ({
  data,
  totalCurrentAssets,
  totalProjectedAssets,
  onEdit,
  onDelete,
  onAdd,
  assetSubClasses,
}) => {
  const getAssetSubClassName = (id: number) => {
    if (!id || !assetSubClasses) return "Unknown";
    const subClass = assetSubClasses.find((s) => s.id === id);
    return subClass?.name || "Unknown";
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Asset Growth & SIPs</h5>
        <Button variant="outline-primary" size="sm" onClick={onAdd}>
          <BsPlus size={20} /> Add
        </Button>
      </Card.Header>
      <Card.Body className="p-0">
        {/* Desktop Table View */}
        <div className="d-none d-md-block">
          <Table hover responsive className="mb-0">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Current Value</th>
                <th>SIP/Month</th>
                <th>Lumpsum/Year</th>
                <th>Projected (1Y)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className={getDynamicBgClass((item as any).assetClasses_id)}>
                  <td>{getAssetSubClassName(item.assetSubClasses_id)}</td>
                  <td>
                    <span className="fw-bold text-success fs-6">
                      {toLocalCurrency(item.currentAllocation)}
                    </span>
                  </td>
                  <td>
                    <span className="fw-bold text-success fs-6">
                      {toLocalCurrency(item.newMonthlyInvestment)}
                    </span>
                  </td>
                  <td>
                    <span className="fw-bold text-success fs-6">
                      {toLocalCurrency(item.lumpsumExpected)}
                    </span>
                  </td>
                  <td>
                    <span className="fw-bold text-success fs-6">
                      {toLocalCurrency(item.projectedValue)}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant="link"
                      className="text-primary p-0 me-2"
                      onClick={() => onEdit(item)}
                    >
                      <BsPencil />
                    </Button>
                    <Button
                      variant="link"
                      className="text-danger p-0"
                      onClick={() => onDelete(item.id!)}
                    >
                      <BsTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>
                    <span className="fw-bold text-success fs-6">
                      {toLocalCurrency(totalCurrentAssets)}
                    </span>
                  </strong>
                </td>
                <td colSpan={2}></td>
                <td>
                  <strong>
                    <span className="fw-bold text-success fs-6">
                      {toLocalCurrency(totalProjectedAssets)}
                    </span>
                  </strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="d-md-none">
          {data.map((item) => (
            <Card key={item.id} className={`m-2 ${getDynamicBgClass((item as any).assetClasses_id)}`}>
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h6 className="mb-0">
                    {getAssetSubClassName(item.assetSubClasses_id)}
                  </h6>
                  <div>
                    <Button
                      variant="link"
                      className="text-primary p-0 me-2"
                      size="sm"
                      onClick={() => onEdit(item)}
                    >
                      <BsPencil />
                    </Button>
                    <Button
                      variant="link"
                      className="text-danger p-0"
                      size="sm"
                      onClick={() => onDelete(item.id!)}
                    >
                      <BsTrash />
                    </Button>
                  </div>
                </div>
                <div className="small">
                  <div className="row mb-1">
                    <div className="col-6 text-muted">Current Value:</div>
                    <div className="col-6 text-end">
                      <strong>
                        <span className="fw-bold text-success fs-6">
                          {toLocalCurrency(item.currentAllocation)}
                        </span>
                      </strong>
                    </div>
                  </div>
                  <div className="row mb-1">
                    <div className="col-6 text-muted">Projected (1Y):</div>
                    <div className="col-6 text-end">
                      <strong>
                        <span className="fw-bold text-success fs-6">
                          {toLocalCurrency(item.projectedValue)}
                        </span>
                      </strong>
                    </div>
                  </div>
                  <div className="row mb-1">
                    <div className="col-6 text-muted">SIP/Month:</div>
                    <div className="col-6 text-end">
                      <span className="fw-bold text-success fs-6">
                        {toLocalCurrency(item.newMonthlyInvestment)}
                      </span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-6 text-muted">Lumpsum/Year:</div>
                    <div className="col-6 text-end">
                      <span className="fw-bold text-success fs-6">
                        {toLocalCurrency(item.lumpsumExpected)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
          <div className="p-3 m-2 rounded">
            <div className="row small">
              <div className="col-6">
                <strong>Total Current:</strong>
              </div>
              <div className="col-6 text-end">
                <strong>
                  <span className="fw-bold text-success fs-6">
                    {toLocalCurrency(totalCurrentAssets)}
                  </span>
                </strong>
              </div>
            </div>
            <div className="row small">
              <div className="col-6">
                <strong>Total Projected (1Y):</strong>
              </div>
              <div className="col-6 text-end">
                <strong>
                  <span className="fw-bold text-success fs-6">
                    {toLocalCurrency(totalProjectedAssets)}
                  </span>
                </strong>
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};
