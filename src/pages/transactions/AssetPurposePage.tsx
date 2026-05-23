import { AssetPurpose } from "@/infrastructure/db/db";
import GenericCRUDPage from "@/components/common/GenericCRUDPage";

export default function AssetPurposePage() {
  return (
    <GenericCRUDPage<AssetPurpose>
      config={{
        title: "Asset Purposes",
        tableName: "assetPurposes",
        columns: [{ field: "name", headerName: "Name" }],
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "type", label: "Key", type: "text" }
        ]
      }}
    />
  );
}
