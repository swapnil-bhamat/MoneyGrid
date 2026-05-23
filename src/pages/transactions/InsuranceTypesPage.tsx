import { InsuranceType } from "@/infrastructure/db/db";
import GenericCRUDPage from "@/components/common/GenericCRUDPage";

export default function InsuranceTypesPage() {
  return (
    <GenericCRUDPage<InsuranceType>
      config={{
        title: "Insurance Types",
        tableName: "insuranceTypes",
        columns: [{ field: "name", headerName: "Name" }],
        fields: [{ name: "name", label: "Name", type: "text", required: true }]
      }}
    />
  );
}
