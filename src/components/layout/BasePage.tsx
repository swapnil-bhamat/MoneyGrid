import React, { useState, useMemo } from "react";
import { Container, Alert, Button, Accordion } from "react-bootstrap";
import { BsSearch, BsPlus } from "react-icons/bs";
import { SearchInput } from "../common/SearchInput";
import { DeleteConfirmationModal } from "../common/DeleteConfirmationModal";
import { SaveConfirmationModal } from "../common/SaveConfirmationModal";
import { MobileCardView } from "../common/MobileCardView";
import { DesktopTableView } from "../common/DesktopTableView";
import { Column, BaseRecord } from "@/types/ui";

export interface BasePageFormProps<T> {
  show: boolean;
  onHide: () => void;
  item?: T;
  onSave: (item: T | Partial<T>) => Promise<void>;
  isValid?: boolean;
}

interface BasePageProps<T extends BaseRecord> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onAdd: (item: Partial<T>) => Promise<void>;
  onEdit: (item: T) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  FormComponent: React.ComponentType<BasePageFormProps<T>>;
  validateForm?: (item: Partial<T>) => boolean;
  extraActions?: React.ReactNode;
  getRowClassName?: (item: T) => string;
  summary?: React.ReactNode;
  groupBy?: (item: T) => { key: string; label: string };
  groupSort?: (a: string, b: string) => number;
  groupRightLabel?: (items: T[]) => string;
}

type AppError = {
  type: "database" | "validation";
  message: string;
};

const getTextContent = (node: React.ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return node.toString();
  }
  if (Array.isArray(node)) {
    return node.map(getTextContent).join(" ");
  }
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    return getTextContent(element.props.children || "");
  }
  return "";
};

export default function BasePage<T extends BaseRecord>({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  FormComponent,
  validateForm,
  extraActions,
  getRowClassName,
  summary,
  groupBy,
  groupSort,
  groupRightLabel,
}: BasePageProps<T>) {
  const [selectedItem, setSelectedItem] = useState<T | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | undefined>();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [itemToSave, setItemToSave] = useState<T | Partial<T> | undefined>();
  const [formData, setFormData] = useState<Partial<T> | undefined>();
  const [error, setError] = useState<AppError | null>(null);
  const isValid = formData && (!validateForm || validateForm(formData));

  const handleAdd = () => {
    setSelectedItem(undefined);
    setShowForm(true);
  };

  const handleEdit = (item: T) => {
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedItem(undefined);
    setItemToSave(undefined);
  };

  const handleSaveClick = async (item: T | Partial<T>) => {
    setFormData(item);

    if (validateForm && !validateForm(item)) {
      return;
    }

    setItemToSave(item);
    setShowSaveModal(true);
  };

  const handleSaveConfirm = async () => {
    if (!itemToSave) return;

    try {
      if (selectedItem) {
        await onEdit(itemToSave as T);
      } else {
        await onAdd(itemToSave);
      }
      setShowSaveModal(false);
      setItemToSave(undefined);
      setFormData(undefined);
      setShowForm(false);
      setSelectedItem(undefined);
      setError(null);
    } catch (err) {
      setError(err as AppError);
    }
  };

  const handleDeleteClick = (item: T) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await onDelete(itemToDelete);
      setShowDeleteModal(false);
      setItemToDelete(undefined);
      setError(null);
    } catch (err) {
      setError(err as AppError);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    const cleanTextForSearch = (text: string) => {
      return text.replace(/[,₹]/g, "").toLowerCase();
    };

    const cleanedSearchQuery = cleanTextForSearch(searchQuery);

    if (!cleanedSearchQuery) {
      return data;
    }

    return data.filter((item) => {
      return columns.some((column) => {
        const rawValue = column.renderCell
          ? getTextContent(column.renderCell(item))
          : item[column.field]?.toString() || "";
        const cleanedValue = cleanTextForSearch(rawValue);
        return cleanedValue.includes(cleanedSearchQuery);
      });
    });
  }, [data, columns, searchQuery]);

  const groupedData = useMemo(() => {
    if (!groupBy) return null;

    const groups: { [key: string]: { label: string; items: T[] } } = {};
    filteredData.forEach((item) => {
      const { key, label } = groupBy(item);
      if (!groups[key]) {
        groups[key] = { label, items: [] };
      }
      groups[key].items.push(item);
    });

    const sortedKeys = Object.keys(groups).sort(groupSort || ((a, b) => a.localeCompare(b)));
    
    return sortedKeys.map(key => ({
      key,
      label: groups[key].label,
      items: groups[key].items
    }));
  }, [filteredData, groupBy, groupSort]);

  const handleDownload = () => {
    const headers = columns.map((col) => col.headerName).join(" | ");
    const separators = columns.map(() => "---").join(" | ");

    const mdRows = filteredData.map((item) => {
      const cells = columns.map((col) => {
        const content = col.renderCell
          ? getTextContent(col.renderCell(item))
          : (item[col.field as keyof T]?.toString() || "");
        return content.toString().replace(/\|/g, "\\|").replace(/\n/g, " ");
      });
      return `| ${cells.join(" | ")} |`;
    });

    const markdown = `| ${headers} |\n| ${separators} |\n${mdRows.join("\n")}`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatErrorMessage = (error: AppError): string => {
    switch (error.type) {
      case "validation":
        return `Validation Error: ${error.message}`;
      case "database":
        return `Database Error: ${error.message}`;
      default:
        return "An unexpected error occurred";
    }
  };

  return (
    <Container
      fluid
      className="p-0 h-100 d-flex flex-column"
      style={{ maxHeight: "85vh" }}
    >
      {/* Sticky Header Section */}
      <div
        className="bg-body border-bottom sticky-top shadow-sm"
        style={{ zIndex: 1020 }}
      >
        <div className="p-3">
          <SearchInput
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAdd={handleAdd}
            onDownload={handleDownload}
            extraActions={extraActions}
            title={title}
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-3 pt-3">
          <Alert
            variant={error.type === "validation" ? "warning" : "danger"}
            dismissible
            onClose={() => setError(null)}
            className="mb-0"
          >
            <div className="d-flex align-items-start gap-2">
              <span className="fw-bold">⚠️</span>
              <div className="flex-grow-1">{formatErrorMessage(error)}</div>
            </div>
          </Alert>
        </div>
      )}

      {/* Summary Section */}
      {summary && (
        <div className="bg-body-tertiary border-bottom">
          {summary}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-grow-1 overflow-auto">
        {/* Empty State */}
        {filteredData.length === 0 && (
          <div className="text-center py-5 px-3">
            <div className="text-muted mb-3">
              <BsSearch size={48} />
            </div>
            <h5 className="text-muted">No items found</h5>
            <p className="text-muted small mb-3">
              {searchQuery
                ? "Try adjusting your search"
                : `No ${title.toLowerCase()} available`}
            </p>
            {!searchQuery && (
              <Button variant="outline-primary" onClick={handleAdd}>
                <BsPlus size={20} className="me-1" />
                Add {title.replace(/s$/, "")}
              </Button>
            )}
          </div>
        )}

        {groupBy && groupedData ? (
          <Accordion alwaysOpen defaultActiveKey={groupedData.map(g => g.key)}>
            {groupedData.map((group) => (
              <Accordion.Item key={group.key} eventKey={group.key} className="mb-4 border-0 bg-transparent">
                <Accordion.Header className="group-accordion-header">
                  <div className="d-flex justify-content-between align-items-center w-100 me-3">
                    <span className="fw-bold">{group.label}</span>
                    {groupRightLabel && <span className="fw-bold">{groupRightLabel(group.items)}</span>}
                  </div>
                </Accordion.Header>
                <Accordion.Body className="p-0 pt-2">
                  <MobileCardView
                    data={group.items}
                    columns={columns}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    getCardClassName={getRowClassName}
                  />
                  <DesktopTableView
                    data={group.items}
                    columns={columns}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    getRowClassName={getRowClassName}
                  />
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <>
            {/* Mobile Compact Card View */}
            <MobileCardView
              data={filteredData}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              getCardClassName={getRowClassName}
            />

            {/* Desktop Table View */}
            <DesktopTableView
              data={filteredData}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              getRowClassName={getRowClassName}
            />
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        itemName={title.replace(/s$/, "")}
      />

      {/* Save Confirmation Modal */}
      <SaveConfirmationModal
        show={showSaveModal}
        onHide={() => setShowSaveModal(false)}
        onConfirm={handleSaveConfirm}
        isEdit={!!selectedItem}
        itemName={title.replace(/s$/, "")}
        isValid={!!isValid}
      />

      {/* Form Modal */}
      {showForm && (
        <FormComponent
          show={showForm}
          onHide={handleClose}
          item={selectedItem}
          onSave={handleSaveClick}
          isValid={isValid}
        />
      )}
    </Container>
  );
}
