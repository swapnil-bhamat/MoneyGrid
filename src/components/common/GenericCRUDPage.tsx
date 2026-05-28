import React, { useState, useEffect } from "react";
import { Form } from "react-bootstrap";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import BasePage, { BasePageFormProps } from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";
import FormSelect from "@/components/common/FormSelect";
import { FieldSchema, GenericCRUDConfig } from "@/types/crud.types";
import { BaseRecord } from "@/infrastructure/db/db.types";

import { t } from "@/utils/localization";

interface GenericFormProps<T> extends BasePageFormProps<T> {
  fields: FieldSchema<T>[];
  title: string;
}

function GenericForm<T extends BaseRecord & { name?: string }>({
  show,
  onHide,
  item,
  fields,
  onSave,
  title,
}: GenericFormProps<T>) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, any[]>>({});

  // Initialize values
  useEffect(() => {
    const initialData: Record<string, any> = {};
    fields.forEach((field) => {
      initialData[field.name] = item ? (item as any)[field.name] : (field.defaultValue ?? "");
    });
    setFormData(initialData);

    // Resolve dropdowns dynamically if any
    fields.forEach(async (field) => {
      if (field.type === "select" && field.optionsQuery) {
        try {
          const data = await field.optionsQuery();
          setDropdownOptions((prev) => ({ ...prev, [field.name]: data }));
        } catch (err) {
          console.error(`Failed to load options for ${field.name}`, err);
        }
      }
    });
  }, [item, fields]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      ...formData,
    } as T);
  };

  // Basic validation check based on required fields in schema
  const isValid = fields
    .filter((f) => f.required)
    .every((f) => {
      const val = formData[f.name];
      return val !== undefined && val !== null && String(val).trim() !== "";
    });

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={`${item ? t.common.edit : t.common.add} ${title}`}
      isValid={isValid}
    >
      {fields.map((field) => {
        if (field.type === "select") {
          return (
            <FormSelect
              key={field.name}
              controlId={`form-${field.name}`}
              label={field.label}
              value={formData[field.name] ?? ""}
              onChange={(e) => handleChange(field.name, Number(e.target.value))}
              options={dropdownOptions[field.name] ?? []}
              defaultText={`${t.common.select} ${field.label}`}
            />
          );
        }

        return (
          <Form.Group className="mb-3" key={field.name} controlId={`form-${field.name}`}>
            <Form.Label>{field.label}</Form.Label>
            <Form.Control
              type={field.type}
              value={formData[field.name] ?? ""}
              onChange={(e) =>
                handleChange(
                  field.name,
                  field.type === "number" ? Number(e.target.value) : e.target.value
                )
              }
            />
          </Form.Group>
        );
      })}
    </FormModal>
  );
}

export default function GenericCRUDPage<T extends BaseRecord & { name?: string }>({
  config,
}: {
  config: GenericCRUDConfig<T>;
}) {
  const table = (db as any)[config.tableName];

  // Dynamic dexie query
  const records = useLiveQuery(() => table.toArray()) ?? [];

  const handleAdd = async (item: Partial<T>) => {
    const recordToAdd = {
      id: Date.now(),
      ...item,
    };
    await table.add(recordToAdd);
  };

  const handleEdit = async (item: T) => {
    await table.put(item);
  };

  const handleDelete = async (item: T) => {
    await table.delete(item.id);
  };

  return (
    <BasePage<T>
      title={config.title}
      data={records}
      columns={config.columns as any}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={(props) => (
        <GenericForm
          {...props}
          fields={config.fields}
          title={config.title.replace(/s$/, "")}
        />
      )}
    />
  );
}
