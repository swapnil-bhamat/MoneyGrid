import { SipType } from "@/infrastructure/db/db";
import GenericCRUDPage from "@/components/common/GenericCRUDPage";

export default function SipTypesPage() {
  return (
    <GenericCRUDPage<SipType>
      config={{
        title: "SIP Types",
        tableName: "sipTypes",
        columns: [{ field: "name", headerName: "Name" }],
        fields: [{ name: "name", label: "Name", type: "text", required: true }]
      }}
    />
  );
}
