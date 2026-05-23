import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import FormSelect from "./FormSelect";

interface HolderSelectProps {
  value: number | undefined;
  onChange: (value: number) => void;
  label?: string;
  defaultText?: string;
}

export default function HolderSelect({
  value,
  onChange,
  label = "Holder",
  defaultText = "Select Holder",
}: HolderSelectProps) {
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  return (
    <FormSelect
      controlId="formHolderSelect"
      label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      options={holders.map((h) => ({ id: h.id, name: h.name }))}
      defaultText={defaultText}
    />
  );
}
