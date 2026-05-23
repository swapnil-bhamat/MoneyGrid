import { useState } from "react";
import { Form } from "react-bootstrap";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { AssetClass } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";

interface AssetClassFormProps {
  show: boolean;
  onHide: () => void;
  item?: AssetClass;
  onSave: (item: AssetClass | Partial<AssetClass>) => Promise<void>;
  isValid?: boolean;
}

const AssetClassForm = ({
  item,
  onSave,
  onHide,
  show,
  isValid,
}: AssetClassFormProps) => {
  const [name, setName] = useState(item?.name ?? "");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    onSave({
      ...(item ?? {}),
      name: name.trim(),
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Asset Class" : "Add Asset Class"}
      error={error}
      isValid={isValid}
    >
      <Form.Group className="mb-3">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
        />
      </Form.Group>
    </FormModal>
  );
};

export default function AssetClassesPage() {
  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];

  const handleAdd = async (assetClass: Partial<AssetClass>) => {
    const newAssetClass: AssetClass = {
      id: Date.now(),
      name: assetClass.name ?? "",
    };
    await db.assetClasses.add(newAssetClass);
  };

  const handleEdit = async (assetClass: AssetClass) => {
    await db.assetClasses.put(assetClass);
  };

  const handleDelete = async (assetClass: AssetClass) => {
    await db.assetClasses.delete(assetClass.id);
  };

  return (
    <BasePage<AssetClass>
      title="Asset Classes"
      data={assetClasses}
      columns={[{ field: "name", headerName: "Name" }]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AssetClassForm}
    />
  );
}
