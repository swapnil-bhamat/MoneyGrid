import { Holder } from "@/infrastructure/db/db";
import GenericCRUDPage from "@/components/common/GenericCRUDPage";

export default function HoldersPage() {
  return (
    <GenericCRUDPage<Holder>
      config={{
        title: "Family Members",
        tableName: "holders",
        columns: [{ field: "name", headerName: "Name" }],
        fields: [{ name: "name", label: "Name", type: "text", required: true }]
      }}
    />
  );
}
