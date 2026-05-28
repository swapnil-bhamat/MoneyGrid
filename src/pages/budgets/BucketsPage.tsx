import { useState } from "react";
import { Form } from "react-bootstrap";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { Bucket } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";
import { t } from "@/utils/localization";

interface BucketFormProps {
  show: boolean;
  onHide: () => void;
  item?: Bucket;
  onSave: (item: Bucket | Partial<Bucket>) => Promise<void>;
  isValid?: boolean;
}

function BucketForm({ item, onSave, onHide, show, isValid }: BucketFormProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [error, setError] = useState("");

  const validate = () => {
    if (!name.trim()) {
      setError("Name is required");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
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
      title={item ? "Edit Bucket" : "Add Bucket"}
      error={error}
      isValid={isValid}
    >
      <Form.Group className="mb-3">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          autoFocus
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
          isInvalid={!!error}
        />
      </Form.Group>
    </FormModal>
  );
}

export default function BucketsPage() {
  const buckets = useLiveQuery(() => db.buckets.toArray()) ?? [];

  const handleAdd = async (bucket: Partial<Bucket>) => {
    await db.buckets.add(bucket as Bucket);
  };

  const handleEdit = async (bucket: Bucket) => {
    await db.buckets.put(bucket);
  };

  const handleDelete = async (bucket: Bucket) => {
    await db.buckets.delete(bucket.id);
  };

  return (
    <BasePage<Bucket>
      title={t.dashboard.assetAllocationBucket}
      data={buckets}
      columns={[{ field: "name", headerName: "Name" }]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={BucketForm}
    />
  );
}
