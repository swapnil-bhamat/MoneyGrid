import { useState } from "react";
import { Form } from "react-bootstrap";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { AssetSubClass } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";
import FormSelect from "@/components/common/FormSelect";

interface AssetClassFormProps {
  show: boolean;
  onHide: () => void;
  item?: AssetSubClass;
  onSave: (item: AssetSubClass | Partial<AssetSubClass>) => Promise<void>;
  isValid?: boolean;
}

const AssetSubClassForm = ({
  item,
  onSave,
  onHide,
  show,
  isValid,
}: AssetClassFormProps) => {
  const [name, setName] = useState(item?.name ?? "");
  const [expectedReturns, setExpectedReturns] = useState(
    item?.expectedReturns ?? 0
  );
  const [assetClasses_id, setAssetClassesId] = useState(
    item?.assetClasses_id ?? 0
  );
  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name: name.trim(),
      assetClasses_id,
      expectedReturns,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Asset Sub Class" : "Add Asset Sub Class"}
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
      <FormSelect
        controlId="formAssetClass"
        label="Asset Class"
        value={assetClasses_id}
        onChange={(e) => setAssetClassesId(Number(e.target.value))}
        options={assetClasses}
        defaultText="Select Asset Class"
      />
      <Form.Group className="mb-3">
        <Form.Label>Expected Returns</Form.Label>
        <Form.Control
          type="number"
          value={expectedReturns}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setExpectedReturns(Number(e.target.value))
          }
        />
      </Form.Group>
    </FormModal>
  );
};

export default function AssetSubClassPage() {
  const assetSubClasses =
    useLiveQuery(() => db.assetSubClasses.toArray()) ?? [];
  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];

  const handleAdd = async (assetClass: Partial<AssetSubClass>) => {
    const newAssetClass: AssetSubClass = {
      id: Date.now(),
      name: assetClass.name ?? "",
      assetClasses_id: assetClass.assetClasses_id ?? 0,
      expectedReturns: assetClass.expectedReturns ?? 0,
    };
    await db.assetSubClasses.add(newAssetClass);
  };

  const handleEdit = async (assetClass: AssetSubClass) => {
    await db.assetSubClasses.put(assetClass);
  };

  const handleDelete = async (assetClass: AssetSubClass) => {
    await db.assetSubClasses.delete(assetClass.id);
  };
  const getAssetClassName = (id: number) => {
    const assetClass = assetClasses.find((ac) => ac.id === id);
    return assetClass?.name ?? "";
  };

  return (
    <BasePage<AssetSubClass>
      title="Asset Sub Classes"
      data={assetSubClasses}
      columns={[
        { field: "name", headerName: "Name" },
        {
          field: "assetClasses_id",
          headerName: "Asset Class",
          renderCell: (item) => getAssetClassName(item.assetClasses_id),
        },
        {
          field: "expectedReturns",
          headerName: "Average Returns (%)",
          renderCell: (item) => `${item.expectedReturns}%`,
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AssetSubClassForm}
    />
  );
}
