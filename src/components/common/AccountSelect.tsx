import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import FormSelect from "./FormSelect";

interface AccountSelectProps {
  value: number | undefined;
  onChange: (value: number) => void;
  label?: string;
  defaultText?: string;
}

export default function AccountSelect({
  value,
  onChange,
  label = "Account",
  defaultText = "Select Account",
}: AccountSelectProps) {
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];

  return (
    <FormSelect
      controlId="formAccountSelect"
      label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      options={accounts.map((a) => ({ id: a.id, name: `${a.bank} (${a.accountNumber})` }))}
      defaultText={defaultText}
    />
  );
}
