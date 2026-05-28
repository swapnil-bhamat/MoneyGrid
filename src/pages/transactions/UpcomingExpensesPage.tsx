import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { UpcomingExpense } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";
import { Form, Badge, Button, Card, Row, Col } from "react-bootstrap";
import { useMemo } from "react";
import { toLocalCurrency } from "@/utils/numberUtils";
import AmountInput from "@/components/common/AmountInput";
import FormSelect from "@/components/common/FormSelect";
import { BsCheckCircleFill, BsCircle } from "react-icons/bs";
import { getKeywordDetails } from "@/utils/keywordRegistry";
import { t } from "@/utils/localization";

import { convertToDateInputFormat, convertFromDateInputFormat } from "@/utils/dateUtils";

interface UpcomingExpenseFormProps {
  show: boolean;
  onHide: () => void;
  item?: UpcomingExpense;
  onSave: (item: UpcomingExpense | Partial<UpcomingExpense>) => Promise<void>;
}

function UpcomingExpenseForm({ item, onSave, onHide, show }: UpcomingExpenseFormProps) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [dueDate, setDueDate] = useState(item?.dueDate ?? "");
  const [assetPurpose_id, setAssetPurposeId] = useState(item?.assetPurpose_id ?? 0);
  const [amount, setAmount] = useState(item?.amount ?? 0);
  const [isCompleted, setIsCompleted] = useState(item?.isCompleted ?? false);
  const [notes, setNotes] = useState(item?.notes ?? "");

  useEffect(() => {
    if (item) {
      setTitle(item.title ?? "");
      setDescription(item.description ?? "");
      setDueDate(item.dueDate ?? "");
      setAssetPurposeId(item.assetPurpose_id ?? 0);
      setAmount(item.amount ?? 0);
      setIsCompleted(item.isCompleted ?? false);
      setNotes(item.notes ?? "");
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      title,
      description,
      dueDate,
      assetPurpose_id,
      amount,
      isCompleted,
      notes,
    });
  };

  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? t.upcomingExpenses.editExpense : t.upcomingExpenses.addExpense}
      isValid={!!title && !!dueDate}
    >
      <Form.Group className="mb-3" controlId="formExpenseTitle">
        <Form.Label>{t.upcomingExpenses.expenseTitle}</Form.Label>
        <Form.Control
          type="text"
          value={title}
          autoFocus
          required
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.upcomingExpenses.expenseTitlePlaceholder}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="formExpenseDescription">
        <Form.Label>{t.common.description}</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description..."
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="formExpenseDueDate">
        <Form.Label>{t.upcomingExpenses.dueDate}</Form.Label>
        <Form.Control
          type="date"
          value={convertToDateInputFormat(dueDate)}
          required
          onChange={(e) => setDueDate(convertFromDateInputFormat(e.target.value))}
        />
      </Form.Group>

      <FormSelect
        controlId="formExpensePurpose"
        label={t.common.purpose}
        value={assetPurpose_id}
        onChange={(e) => setAssetPurposeId(Number(e.target.value))}
        options={assetPurposes}
        defaultText="Select Purpose"
      />

      <Form.Group className="mb-3" controlId="formExpenseAmount">
        <Form.Label>{t.common.amount}</Form.Label>
        <AmountInput
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="formExpenseNotes">
        <Form.Label>{t.common.notes}</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra information..."
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="formExpenseCompleted">
        <Form.Check
          type="checkbox"
          label={t.upcomingExpenses.completed}
          checked={isCompleted}
          onChange={(e) => setIsCompleted(e.target.checked)}
        />
      </Form.Group>
    </FormModal>
  );
}

export default function UpcomingExpensesPage() {
  const expenses = useLiveQuery(() => db.upcomingExpenses.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  const pendingExpenses = useMemo(() => expenses.filter((e) => !e.isCompleted), [expenses]);
  const totalPending = useMemo(() => pendingExpenses.reduce((sum, e) => sum + e.amount, 0), [pendingExpenses]);

  const totalsByPurpose = useMemo(() => {
    return assetPurposes
      .map((purpose) => {
        const amount = pendingExpenses
          .filter((e) => e.assetPurpose_id === purpose.id)
          .reduce((sum, e) => sum + e.amount, 0);
        return { name: purpose.name, amount, id: purpose.id };
      })
      .filter((p) => p.amount > 0);
  }, [pendingExpenses, assetPurposes]);

  const summary = (
    <div className="p-3">
      <Row className="g-3">
        <Col xs={12} md={4}>
          <Card className="h-100 border-0 shadow-sm bg-body-secondary">
            <Card.Body className="d-flex flex-column justify-content-center py-2">
              <Card.Subtitle className="text-muted small">{t.upcomingExpenses.totalPending}</Card.Subtitle>
              <Card.Title className="mb-0 fs-4 fw-bold text-primary">{toLocalCurrency(totalPending)}</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="py-2">
              <Card.Subtitle className="text-muted small mb-2">{t.upcomingExpenses.byPurpose}</Card.Subtitle>
              <div className="d-flex flex-wrap gap-2">
                {totalsByPurpose.map((p) => {
                  const details = getKeywordDetails(p.name);
                  return (
                    <Badge key={p.id} bg={details.color} className="p-2 fw-normal">
                      <span className="me-1">{details.icon}</span>
                      <span className="opacity-75 me-1">{p.name}:</span>
                      {toLocalCurrency(p.amount)}
                    </Badge>
                  );
                })}
                {totalsByPurpose.length === 0 && <span className="text-muted small">{t.upcomingExpenses.noPending}</span>}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const handleAdd = async (expense: Partial<UpcomingExpense>) => {
    await db.upcomingExpenses.add(expense as UpcomingExpense);
  };

  const handleEdit = async (expense: UpcomingExpense) => {
    await db.upcomingExpenses.put(expense);
  };

  const handleDelete = async (expense: UpcomingExpense) => {
    await db.upcomingExpenses.delete(expense.id);
  };

  const toggleCompleted = async (expense: UpcomingExpense) => {
    await db.upcomingExpenses.update(expense.id, {
      isCompleted: !expense.isCompleted,
    });
  };

  const getPurposeName = (id: number) => {
    const purpose = assetPurposes.find((p) => p.id === id);
    return purpose?.name ?? "";
  };

  return (
    <BasePage<UpcomingExpense>
      title={t.upcomingExpenses.title}
      data={[...expenses].sort((a, b) => {
        const dateA = convertToDateInputFormat(a.dueDate);
        const dateB = convertToDateInputFormat(b.dueDate);
        return dateA.localeCompare(dateB);
      })}
      groupBy={(item) => {
        if (!item.dueDate) return { key: "9999-99", label: "No Due Date" };
        const parts = item.dueDate.split("-");
        if (parts.length !== 3) return { key: "9999-99", label: "No Due Date" };
        const [, month, year] = parts;
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const monthIndex = parseInt(month, 10) - 1;
        const monthName = monthNames[monthIndex] || "Unknown";
        return {
          key: `${year}-${month.padStart(2, "0")}`,
          label: `${monthName} ${year}`,
        };
      }}
      groupRightLabel={(items) => toLocalCurrency(items.filter(item => !item.isCompleted).reduce((sum, item) => sum + item.amount, 0))}
      columns={[
        {
          field: "isCompleted",
          headerName: t.common.status,
          renderCell: (item) => (
            <Button
              variant="link"
              className="p-0 text-decoration-none"
              onClick={(e) => {
                e.stopPropagation();
                toggleCompleted(item);
              }}
            >
              {item.isCompleted ? (
                <BsCheckCircleFill className="text-success fs-5" />
              ) : (
                <BsCircle className="text-secondary fs-5" />
              )}
            </Button>
          ),
        },
        { field: "title", headerName: t.common.title },
        {
          field: "dueDate",
          headerName: t.upcomingExpenses.dueDate,
          renderCell: (item) => (
            <span className={item.isCompleted ? "text-decoration-line-through text-muted" : ""}>
              {item.dueDate}
            </span>
          ),
        },
        {
          field: "assetPurpose_id",
          headerName: t.common.purpose,
          renderCell: (item) => {
            const name = getPurposeName(item.assetPurpose_id);
            const details = getKeywordDetails(name);
            return <Badge bg={details.color}>{details.icon} {name}</Badge>;
          },
        },
        {
          field: "amount",
          headerName: t.common.amount,
          renderCell: (item) => (
            <span className={item.isCompleted ? "text-decoration-line-through text-muted" : ""}>
              {toLocalCurrency(item.amount)}
            </span>
          ),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={UpcomingExpenseForm}
      getRowClassName={(item) => item.isCompleted ? "opacity-75 bg-body-tertiary" : ""}
      summary={summary}
    />
  );
}
