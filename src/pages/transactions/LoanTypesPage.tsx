import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { LoanType } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";

interface LoanTypeFormProps {
  show: boolean;
  onHide: () => void;
  item?: LoanType;
  onSave: (item: LoanType | Partial<LoanType>) => Promise<void>;
}

import FormModal from "@/components/common/FormModal";
import { Form } from "react-bootstrap";

function LoanTypeForm({ item, onSave, onHide, show }: LoanTypeFormProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState(item?.type ?? "");
  const [interestRate, setInterestRate] = useState(item?.interestRate ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name,
      type,
      interestRate,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Loan Type" : "Add Loan Type"}
      isValid={!!name}
    >
      <Form.Group className="mb-3" controlId="formLoanTypeName">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          autoFocus
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLoanTypeType">
        <Form.Label>Key</Form.Label>
        <Form.Control
          type="text"
          value={type}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setType(e.target.value)
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLoanTypeInterestRate">
        <Form.Label>Interest Rate</Form.Label>
        <Form.Control
          type="number"
          value={interestRate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInterestRate(Number(e.target.value))
          }
        />
      </Form.Group>
    </FormModal>
  );
}

export default function LoanTypesPage() {
  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleAdd = async (loanType: Partial<LoanType>) => {
    await db.loanTypes.add(loanType as LoanType);
  };

  const handleEdit = async (loanType: LoanType) => {
    await db.loanTypes.put(loanType);
  };

  const handleDelete = async (loanType: LoanType) => {
    await db.loanTypes.delete(loanType.id);
  };

  return (
    <BasePage<LoanType>
      title="Loan Types"
      data={loanTypes}
      columns={[
        { field: "name", headerName: "Name" },
        {
          field: "interestRate",
          headerName: "Interest Rate",
          renderCell: (item) => `${item.interestRate}%`,
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={LoanTypeForm}
    />
  );
}
