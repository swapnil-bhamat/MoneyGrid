import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { Goal } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import { t } from "@/utils/localization";

interface GoalFormProps {
  show: boolean;
  onHide: () => void;
  item?: Goal;
  onSave: (item: Goal | Partial<Goal>) => Promise<void>;
}

import FormModal from "@/components/common/FormModal";
import { Form } from "react-bootstrap";
import { toLocalCurrency } from "@/utils/numberUtils";
import AmountInput from "@/components/common/AmountInput";
import FormSelect from "@/components/common/FormSelect";
import { getDynamicBgClass } from "@/utils/colorUtils";

function GoalForm({ item, onSave, onHide, show }: GoalFormProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [priority, setPriority] = useState(item?.priority ?? 1);
  const [amountRequiredToday, setAmountRequiredToday] = useState(
    item?.amountRequiredToday ?? 0
  );
  const [durationInYears, setDurationInYears] = useState(
    item?.durationInYears ?? 1
  );
  const [assetPurpose_id, setAssetPurposeId] = useState(
    item?.assetPurpose_id ?? 0
  );

  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name,
      priority,
      amountRequiredToday,
      durationInYears,
      assetPurpose_id,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? t.goals.editGoal : t.goals.addGoal}
      isValid={!!name}
    >
      <Form.Group className="mb-3" controlId="formGoalName">
        <Form.Label>{t.goals.goalName}</Form.Label>
        <Form.Control
          type="text"
          value={name}
          autoFocus
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formGoalPriority">
        <Form.Label>{t.goals.priority}</Form.Label>
        <Form.Control
          type="number"
          value={priority}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPriority(Number(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formGoalAmountRequired">
        <Form.Label>{t.goals.targetToday}</Form.Label>
        <AmountInput
          value={amountRequiredToday}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setAmountRequiredToday(Number(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formGoalDuration">
        <Form.Label>{t.goals.durationYears}</Form.Label>
        <Form.Control
          type="number"
          value={durationInYears}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setDurationInYears(Number(e.target.value))
          }
        />
      </Form.Group>
      <FormSelect
        controlId="formGoalAssetPurpose"
        label={t.common.purpose}
        value={assetPurpose_id}
        onChange={(e) => setAssetPurposeId(Number(e.target.value))}
        options={assetPurposes}
        defaultText="Select Asset Purpose"
      />
    </FormModal>
  );
}

export default function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  const handleAdd = async (goal: Partial<Goal>) => {
    await db.goals.add(goal as Goal);
  };

  const handleEdit = async (goal: Goal) => {
    await db.goals.put(goal);
  };

  const handleDelete = async (goal: Goal) => {
    await db.goals.delete(goal.id);
  };

  const getAssetPurposeName = (id: number) => {
    const purpose = assetPurposes.find((ap) => ap.id === id);
    return purpose?.name ?? "";
  };

  return (
    <BasePage<Goal>
      title={t.goals.title}
      data={[...goals].sort((a, b) => (a.assetPurpose_id || 0) - (b.assetPurpose_id || 0))}
      groupBy={(item) => {
        const name = getAssetPurposeName(item.assetPurpose_id);
        return {
          key: String(item.assetPurpose_id),
          label: name || "Unknown Purpose"
        };
      }}
      groupSort={(a, b) => Number(a) - Number(b)}
      groupRightLabel={(items) => toLocalCurrency(items.reduce((sum, item) => sum + item.amountRequiredToday, 0))}
      columns={[
        { field: "name", headerName: t.goals.goalName },
        { field: "priority", headerName: t.goals.priority },
        {
          field: "amountRequiredToday",
          headerName: t.goals.target,
          renderCell: (item) => toLocalCurrency(item.amountRequiredToday),
        },
        { field: "durationInYears", headerName: t.goals.durationYears },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={GoalForm}
      getRowClassName={(item) => getDynamicBgClass(item.assetPurpose_id)}
    />
  );
}
