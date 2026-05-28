import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { Income } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import { t } from "@/utils/localization";

interface IncomeFormProps {
  show: boolean;
  onHide: () => void;
  item?: Income;
  onSave: (item: Income | Partial<Income>) => Promise<void>;
}

import FormModal from "@/components/common/FormModal";
import { Form } from "react-bootstrap";
import { toLocalCurrency } from "@/utils/numberUtils";
import AmountInput from "@/components/common/AmountInput";
import FormSelect from "@/components/common/FormSelect";
import { getDynamicBgClass } from "@/utils/colorUtils";

function IncomeForm({ item, onSave, onHide, show }: IncomeFormProps) {
  const [item_name, setItemName] = useState(item?.item ?? "");
  const [accounts_id, setAccountsId] = useState(item?.accounts_id ?? 0);
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const [monthly, setMonthly] = useState(item?.monthly ?? "0");

  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      item: item_name,
      accounts_id,
      holders_id,
      monthly,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? t.income.editIncome : t.income.addIncome}
      isValid={!!item_name}
    >
      <Form.Group className="mb-3" controlId="formIncomeItem">
        <Form.Label>{t.income.incomeSource}</Form.Label>
        <Form.Control
          type="text"
          value={item_name}
          autoFocus
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setItemName(e.target.value)
          }
        />
      </Form.Group>
      <FormSelect
        controlId="formIncomeHolder"
        label={t.income.holder}
        value={holders_id}
        onChange={(e) => {
          setHoldersId(Number(e.target.value));
          setAccountsId(0);
        }}
        options={holders}
        defaultText="Select Holder"
      />

      <FormSelect
        controlId="formIncomeAccount"
        label="Account"
        value={accounts_id}
        onChange={(e) => setAccountsId(Number(e.target.value))}
        options={accounts
          .filter((acc) => acc.holders_id === holders_id)
          .map((acc) => ({ id: acc.id!, name: acc.bank }))}
        defaultText="Select Account"
      />
      <Form.Group className="mb-3" controlId="formIncomeMonthly">
        <Form.Label>{t.income.monthlyAmount}</Form.Label>
        <AmountInput
          value={monthly}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setMonthly(e.target.value)
          }
        />
      </Form.Group>
    </FormModal>
  );
}

export default function IncomePage() {
  const incomes = useLiveQuery(() => db.income.toArray()) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (income: Partial<Income>) => {
    await db.income.add(income as Income);
  };

  const handleEdit = async (income: Income) => {
    await db.income.put(income);
  };

  const handleDelete = async (income: Income) => {
    await db.income.delete(income.id);
  };

  const getAccountName = (id: number) => {
    const account = accounts.find((a) => a.id === id);
    return account ? account.bank : "";
  };

  const getHolderName = (id: number) => {
    const holder = holders.find((h) => h.id === id);
    return holder?.name ?? "";
  };

  return (
    <BasePage<Income>
      title={t.income.title}
      data={[...incomes].sort((a, b) => (a.holders_id || 0) - (b.holders_id || 0))}
      groupBy={(item) => {
        const name = getHolderName(item.holders_id);
        return {
          key: String(item.holders_id),
          label: name || "Unknown Holder"
        };
      }}
      groupSort={(a, b) => Number(a) - Number(b)}
      groupRightLabel={(items) => toLocalCurrency(items.reduce((sum, item) => sum + Number(item.monthly), 0))}
      columns={[
        { field: "item", headerName: t.income.incomeSource },
        {
          field: "accounts_id",
          headerName: "Account",
          renderCell: (item) => getAccountName(item.accounts_id),
        },
        {
          field: "monthly",
          headerName: t.income.monthlyAmount,
          renderCell: (item) => toLocalCurrency(Number(item.monthly)),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={IncomeForm}
      getRowClassName={(item) => getDynamicBgClass(item.holders_id)}
    />
  );
}
