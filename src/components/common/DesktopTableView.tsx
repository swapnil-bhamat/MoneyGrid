import { Table, Button } from "react-bootstrap";
import { BsPencil, BsTrash } from "react-icons/bs";
import { Column, BaseRecord } from "@/types/ui";

interface DesktopTableViewProps<T extends BaseRecord> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  renderActions?: (item: T) => React.ReactNode;
  getRowClassName?: (item: T) => string;
  renderFooter?: () => React.ReactNode;
  showOnMobile?: boolean;
}

export const DesktopTableView = <T extends BaseRecord>({
  data,
  columns,
  onEdit,
  onDelete,
  renderActions,
  getRowClassName,
  renderFooter,
  showOnMobile = false,
}: DesktopTableViewProps<T>) => {
  const showActions = onEdit || onDelete || renderActions;

  return (
    <div className={`${showOnMobile ? "" : "d-none d-lg-block"} p-3`}>
      <div className="table-responsive">
        <Table striped bordered hover className="mb-0">
          <thead className="table-dark">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.field)}
                  className="border-bottom border-2 text-uppercase small fw-semibold"
                  style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
                >
                  {column.headerName}
                </th>
              ))}
              {showActions && (
                <th
                  className="border-bottom border-2 text-uppercase small fw-semibold text-end"
                  style={{
                    fontSize: "0.75rem",
                    letterSpacing: "0.5px",
                    width: "150px",
                  }}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className={getRowClassName?.(item)}>
                {columns.map((column) => {
                  const cellValue = column.renderCell
                    ? column.renderCell(item)
                    : String(item[column.field]) || "-";
                  const isCurrency =
                    typeof cellValue === "string" && cellValue.includes("₹");

                  return (
                    <td
                      key={String(column.field)}
                      className={`align-middle ${
                        isCurrency ? "fw-bold text-success fs-6" : ""
                      }`}
                    >
                      {cellValue}
                    </td>
                  );
                })}
                {showActions && (
                  <td className="align-middle text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      {renderActions ? (
                        renderActions(item)
                      ) : (
                        <>
                          {onEdit && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="d-flex align-items-center gap-1"
                              onClick={() => onEdit(item)}
                            >
                              <BsPencil size={14} />
                              <span>Edit</span>
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="d-flex align-items-center gap-1"
                              onClick={() => onDelete(item)}
                            >
                              <BsTrash size={14} />
                              <span>Delete</span>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {renderFooter && (
            <tfoot className="fw-bold border-top border-2">
              {renderFooter()}
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
};
