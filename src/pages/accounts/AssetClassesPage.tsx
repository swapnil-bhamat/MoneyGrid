import { AssetClass } from "@/infrastructure/db/db";
import GenericCRUDPage from "@/components/common/GenericCRUDPage";

export default function AssetClassesPage() {
  return (
    <GenericCRUDPage<AssetClass>
      config={{
        title: "Asset Classes",
        tableName: "assetClasses",
        columns: [{ field: "name", headerName: "Name" }],
        fields: [{ name: "name", label: "Name", type: "text", required: true }]
      }}
    />
  );
}
