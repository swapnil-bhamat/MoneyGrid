import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/db/db';
import type { Holder } from '@/infrastructure/db/db';
import BasePage from '@/components/layout/BasePage';
import FormModal from '@/components/common/FormModal';

interface HolderFormProps {
  show: boolean;
  onHide: () => void;
  item?: Holder;
  onSave: (item: Holder | Partial<Holder>) => Promise<void>;
  isValid?: boolean;
}

function HolderForm({ item, onSave, onHide, show, isValid }: HolderFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [error, setError] = useState('');


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    onSave({
      ...(item ?? {}),
      name: name.trim()
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? 'Edit Holder' : 'Add Holder'}
      error={error}
      isValid={isValid}
    >
      <Form.Group className="mb-3">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
      </Form.Group>
    </FormModal>
  );
}

export default function HoldersPage() {
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (holder: Partial<Holder>) => {
    if (!holder.name) throw new Error('Name is required');
    const newHolder: Holder = {
      id: Date.now(),
      name: holder.name ?? ''
    };
    await db.holders.add(newHolder);
  };

  const handleEdit = async (holder: Holder) => {
    await db.holders.put(holder);
  };

  const handleDelete = async (holder: Holder) => {
    await db.holders.delete(holder.id);
  };

  return (
    <BasePage<Holder>
      title="Family Members"
      data={holders}
      columns={[
        { field: 'name', headerName: 'Name' }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={HolderForm}
    />
  );
}
