import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { InsuranceType } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";
import { Form } from "react-bootstrap";

interface InsuranceTypeFormProps {
  show: boolean;
  onHide: () => void;
  item?: InsuranceType;
  onSave: (item: InsuranceType | Partial<InsuranceType>) => Promise<void>;
}

function InsuranceTypeForm({ item, onSave, onHide, show }: InsuranceTypeFormProps) {
  const [name, setName] = useState(item?.name ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Insurance Type" : "Add Insurance Type"}
      isValid={!!name}
    >
      <Form.Group className="mb-3" controlId="formInsuranceTypeName">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          autoFocus
          placeholder="e.g. Health Insurance, Life Insurance"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
        />
      </Form.Group>
    </FormModal>
  );
}

export default function InsuranceTypesPage() {
  const insuranceTypes = useLiveQuery(() => db.insuranceTypes.toArray()) ?? [];

  const handleAdd = async (insuranceType: Partial<InsuranceType>) => {
    await db.insuranceTypes.add(insuranceType as InsuranceType);
  };

  const handleEdit = async (insuranceType: InsuranceType) => {
    await db.insuranceTypes.put(insuranceType);
  };

  const handleDelete = async (insuranceType: InsuranceType) => {
    await db.insuranceTypes.delete(insuranceType.id);
  };

  return (
    <BasePage<InsuranceType>
      title="Insurance Types"
      data={insuranceTypes}
      columns={[
        { field: "name", headerName: "Name" },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={InsuranceTypeForm}
    />
  );
}
