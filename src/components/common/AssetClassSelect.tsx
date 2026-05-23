import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import FormSelect from "./FormSelect";

interface AssetClassSelectProps {
  value: number | undefined;
  onChange: (value: number) => void;
  label?: string;
  defaultText?: string;
}

export default function AssetClassSelect({
  value,
  onChange,
  label = "Asset Class",
  defaultText = "Select Asset Class",
}: AssetClassSelectProps) {
  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];

  return (
    <FormSelect
      controlId="formAssetClassSelect"
      label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      options={assetClasses.map((ac) => ({ id: ac.id, name: ac.name }))}
      defaultText={defaultText}
    />
  );
}
