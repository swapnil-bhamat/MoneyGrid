import { Card, Row, Col, Button } from "react-bootstrap";
import { BsPencil, BsTrash } from "react-icons/bs";
import { Column, BaseRecord } from "@/types/ui";
import { getActiveCurrency } from "@/utils/numberUtils";

interface MobileCardViewProps<T extends BaseRecord> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  renderActions?: (item: T) => React.ReactNode;
  getCardClassName?: (item: T) => string;
  className?: string;
}

export const MobileCardView = <T extends BaseRecord>({
  data,
  columns,
  onEdit,
  onDelete,
  renderActions,
  getCardClassName,
  className,
}: MobileCardViewProps<T>) => {
  const showActions = onEdit || onDelete || renderActions;
  const currency = getActiveCurrency();
  // Separate columns by priority for mobile view
  const primaryColumns = columns.slice(0, 2); // Show first 2 columns prominently
  const secondaryColumns = columns.slice(2); // Rest are secondary

  return (
    <div className={className ?? "d-lg-none p-3"}>
      <Row className="g-3">
        {data.map((item) => (
          <Col xs={12} md={6} xl={4} key={item.id}>
            <Card
              className={`border shadow-sm h-100 ${getCardClassName?.(item) || ""}`}
            >
              <Card.Body className="p-3 d-flex flex-column justify-content-between">
                <div>
                  {/* Compact Header with Primary Info */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div
                      className="flex-grow-1 me-2"
                      style={{ maxWidth: showActions ? "75%" : "100%" }}
                    >
                      {primaryColumns.map((column, colIndex) => {
                        const cellValue = column.renderCell
                          ? column.renderCell(item)
                          : String(item[column.field]) || "-";
                        const isCurrency =
                          typeof cellValue === "string" && cellValue.includes(currency.symbol);

                        return (
                          <div
                            key={String(column.field)}
                            className={colIndex > 0 ? "mt-1" : ""}
                          >
                            {colIndex === 0 ? (
                              // First field - prominent
                              <div
                                className={`fw-bold fs-6 text-truncate ${
                                  isCurrency ? "fw-bold text-success" : ""
                                }`}
                              >
                                {cellValue}
                              </div>
                            ) : (
                              // Second field - subdued
                              <div
                                className={`small text-truncate ${
                                  isCurrency
                                    ? "fw-bold text-success fs-6"
                                    : "text-muted"
                                }`}
                              >
                                {cellValue}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Compact Action Buttons */}
                    {showActions && (
                      <div className="d-flex gap-1 flex-shrink-0 justify-content-end">
                        {renderActions ? (
                          renderActions(item)
                        ) : (
                          <>
                            {onEdit && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="p-1"
                                style={{ width: "32px", height: "32px" }}
                                onClick={() => onEdit(item)}
                              >
                                <BsPencil size={14} />
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="p-1"
                                style={{ width: "32px", height: "32px" }}
                                onClick={() => onDelete(item)}
                              >
                                <BsTrash size={14} />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Secondary Info - Compact Grid */}
                  {secondaryColumns.length > 0 && (
                    <Row className="g-2 mt-1 pt-2 border-top border-opacity-25">
                      {secondaryColumns.map((column) => {
                        const cellValue = column.renderCell
                          ? column.renderCell(item)
                          : String(item[column.field]) || "-";
                        const isCurrency =
                          typeof cellValue === "string" && cellValue.includes(currency.symbol);

                        return (
                          <Col xs={6} key={String(column.field)}>
                            <div
                              className="small text-muted text-uppercase"
                              style={{
                                fontSize: "0.7rem",
                                letterSpacing: "0.3px",
                              }}
                            >
                              {column.headerName}
                            </div>
                            <div
                              className={`small fw-medium text-truncate ${
                                isCurrency ? "fw-bold text-success fs-6" : ""
                              }`}
                              title={String(cellValue)}
                            >
                              {cellValue}
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};
