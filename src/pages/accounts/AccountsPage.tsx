import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Account, db } from "@/infrastructure/db/db";
import React from "react";
import { Form } from "react-bootstrap";
import BasePage from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";
import FormSelect from "@/components/common/FormSelect";
import { t } from "@/utils/localization";

interface AccountFormProps {
  show: boolean;
  onHide: () => void;
  item?: Account;
  onSave: (item: Account | Partial<Account>) => Promise<void>;
  isValid?: boolean;
}

const AccountForm = ({
  item,
  onSave,
  onHide,
  show,
  isValid,
}: AccountFormProps) => {
  const [bank, setBank] = useState(item?.bank ?? "");
  const [accountNumber, setAccountNumber] = useState(item?.accountNumber ?? "");
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      bank,
      accountNumber,
      holders_id,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Account" : "Add Account"}
      isValid={isValid}
    >
      <Form.Group controlId="formBank">
        <Form.Label>Bank</Form.Label>
        <Form.Control
          type="text"
          value={bank}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setBank(e.target.value)
          }
        />
      </Form.Group>
      <Form.Group controlId="formAccountNumber">
        <Form.Label>Account Number</Form.Label>
        <Form.Control
          type="text"
          value={accountNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setAccountNumber(e.target.value)
          }
        />
      </Form.Group>
      <FormSelect
        controlId="formHolder"
        label="Holder"
        value={holders_id}
        onChange={(e) => setHoldersId(Number(e.target.value))}
        options={holders}
        defaultText="Select Holder"
      />
    </FormModal>
  );
};

export default function AccountsPage() {
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (account: Partial<Account>) => {
    const dbAccount = {
      id: Date.now(),
      bank: account.bank ?? "",
      accountNumber: account.accountNumber ?? "",
      holders_id: account.holders_id ?? 0,
    };
    await db.accounts.add(dbAccount);
  };

  const handleEdit = async (account: Account) => {
    const dbAccount = {
      id: account.id,
      bank: account.bank,
      accountNumber: account.accountNumber,
      holders_id: account.holders_id,
    };
    await db.accounts.put(dbAccount);
  };

  const handleDelete = async (account: Account) => {
    await db.accounts.delete(account.id);
  };

  const getHolderName = (id: number) => {
    const holder = holders.find((h) => h.id === id);
    return holder?.name ?? "";
  };

  return (
    <BasePage<Account>
      title={t.common.accounts || "Accounts"}
      data={accounts}
      columns={[
        { field: "bank", headerName: "Bank" },
        { field: "accountNumber", headerName: "Account Number" },
        {
          field: "holders_id",
          headerName: "Holder",
          renderCell: (item) => getHolderName(item.holders_id),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AccountForm}
    />
  );
}
