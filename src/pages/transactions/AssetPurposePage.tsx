import { useState } from "react";
import FormModal from "@/components/common/FormModal";
import { Form } from "react-bootstrap";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { AssetPurpose } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";

interface AssetPurposeFormProps {
  show: boolean;
  onHide: () => void;
  item?: AssetPurpose;
  onSave: (item: AssetPurpose | Partial<AssetPurpose>) => Promise<void>;
}

function AssetPurposeForm({
  item,
  onSave,
  onHide,
  show,
}: AssetPurposeFormProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState(item?.type ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name,
      type,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Asset Purpose" : "Add Asset Purpose"}
      isValid={!!name}
    >
      <Form.Group className="mb-3" controlId="formAssetPurposeName">
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
      <Form.Group className="mb-3" controlId="formAssetPurposeType">
        <Form.Label>Key</Form.Label>
        <Form.Control
          type="text"
          value={type}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setType(e.target.value)
          }
        />
      </Form.Group>
    </FormModal>
  );
}

export default function AssetPurposePage() {
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  const handleAdd = async (purpose: Partial<AssetPurpose>) => {
    await db.assetPurposes.add(purpose as AssetPurpose);
  };

  const handleEdit = async (purpose: AssetPurpose) => {
    await db.assetPurposes.put(purpose);
  };

  const handleDelete = async (purpose: AssetPurpose) => {
    await db.assetPurposes.delete(purpose.id);
  };

  return (
   <BasePage<AssetPurpose>
      title="Asset Purposes"
      data={assetPurposes}
      columns={[{ field: "name", headerName: "Name" }]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AssetPurposeForm}
    />
  );
}
