import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/db/db';
import type { SipType } from '@/infrastructure/db/db';
import BasePage from '@/components/layout/BasePage';

interface SipTypeFormProps {
  show: boolean;
  onHide: () => void;
  item?: SipType;
  onSave: (item: SipType | Partial<SipType>) => Promise<void>;
}

import FormModal from '@/components/common/FormModal';
import { Form } from 'react-bootstrap';

function SipTypeForm({ item, onSave, onHide, show }: SipTypeFormProps) {
  const [name, setName] = useState(item?.name ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? 'Edit SIP Type' : 'Add SIP Type'}
      isValid={!!name}
    >
      <Form.Group className="mb-3" controlId="formSipTypeName">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          autoFocus
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
      </Form.Group>
    </FormModal>
  );
}

export default function SipTypesPage() {
  const sipTypes = useLiveQuery(() => db.sipTypes.toArray()) ?? [];

  const handleAdd = async (sipType: Partial<SipType>) => {
    await db.sipTypes.add(sipType as SipType);
  };

  const handleEdit = async (sipType: SipType) => {
    await db.sipTypes.put(sipType);
  };

  const handleDelete = async (sipType: SipType) => {
    await db.sipTypes.delete(sipType.id);
  };

  return (
    <BasePage<SipType>
      title="SIP Types"
      data={sipTypes}
      columns={[
        { field: 'name', headerName: 'Name' }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={SipTypeForm}
    />
  );
}
