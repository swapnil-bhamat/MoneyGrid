import React from "react";
import { Card, Table, Button } from "react-bootstrap";
import { BsPlus, BsPencil, BsTrash } from "react-icons/bs";
import { toLocalCurrency } from "@/utils/numberUtils";
import { LiabilityProjectionData } from "@/services/projectionService";
import { Liability, LoanType } from "@/infrastructure/db/db.types";
import { getDynamicBgClass } from "@/utils/colorUtils";

interface LiabilityProjectionTableProps {
  data: LiabilityProjectionData[];
  totalCurrentLiabilities: number;
  totalProjectedLiabilities: number;
  onEdit: (item: LiabilityProjectionData) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  liabilities: Liability[] | undefined;
  loanTypes: LoanType[] | undefined;
}

export const LiabilityProjectionTable: React.FC<LiabilityProjectionTableProps> =
  ({
    data,
    totalCurrentLiabilities,
    totalProjectedLiabilities,
    onEdit,
    onDelete,
    onAdd,
    liabilities,
    loanTypes,
  }) => {
    const getLiabilityName = (id: number | undefined) => {
      if (!id || !liabilities || !loanTypes) return "Unknown";
      const liability = liabilities.find((l) => l.id === id);
      if (!liability) return "Unknown";
      const type = loanTypes.find((t) => t.id === liability.loanType_id);
      return `${type?.name || "Loan"} (${toLocalCurrency(
        liability.loanAmount
      )})`;
    };

    const getLoanTypeName = (id: number | undefined) => {
      if (!id || !loanTypes) return "Unknown";
      const type = loanTypes.find((t) => t.id === id);
      return type?.name || "Unknown";
    };

    return (
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Liability Management</h5>
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
                  <th>Liability</th>
                  <th>Current Balance</th>
                  <th>Prepayment/Year</th>
                  <th>Projected (1Y)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className={getDynamicBgClass(item.loanType_id)}>
                    <td>
                      {item.isFutureLoan
                        ? `${getLoanTypeName(item.loanType_id)} (Future)`
                        : getLiabilityName(item.liability_id)}
                    </td>
                    <td>
                      <span className="fw-bold text-danger fs-6">
                        {toLocalCurrency(item.currentBalance)}
                      </span>
                    </td>
                    <td>
                      <span className="fw-bold text-danger fs-6">
                        {toLocalCurrency(item.prepaymentExpected)}
                      </span>
                    </td>
                    <td>
                      <span className="fw-bold text-danger fs-6">
                        {toLocalCurrency(item.projectedBalance)}
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
                      <span className="fw-bold text-danger fs-6">
                        {toLocalCurrency(totalCurrentLiabilities)}
                      </span>
                    </strong>
                  </td>
                  <td></td>
                  <td>
                    <strong>
                      <span className="fw-bold text-danger fs-6">
                        {toLocalCurrency(totalProjectedLiabilities)}
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
              <Card key={item.id} className={`m-2 ${getDynamicBgClass(item.loanType_id)}`}>
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="mb-0">
                      {item.isFutureLoan
                        ? `${getLoanTypeName(item.loanType_id)} (Future)`
                        : getLiabilityName(item.liability_id)}
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
                      <div className="col-6 text-muted">Current Balance:</div>
                      <div className="col-6 text-end">
                        <strong>
                          <span className="fw-bold text-danger fs-6">
                            {toLocalCurrency(item.currentBalance)}
                          </span>
                        </strong>
                      </div>
                    </div>
                    <div className="row mb-1">
                      <div className="col-6 text-muted">Projected (1Y):</div>
                      <div className="col-6 text-end">
                        <strong>
                          <span className="fw-bold text-danger fs-6">
                            {toLocalCurrency(item.projectedBalance)}
                          </span>
                        </strong>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-6 text-muted">Prepayment/Year:</div>
                      <div className="col-6 text-end">
                        <span className="fw-bold text-danger fs-6">
                          {toLocalCurrency(item.prepaymentExpected)}
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
                    <span className="fw-bold text-danger fs-6">
                      {toLocalCurrency(totalCurrentLiabilities)}
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
                    <span className="fw-bold text-danger fs-6">
                      {toLocalCurrency(totalProjectedLiabilities)}
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
