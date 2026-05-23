import { AssetSubClass, db } from "@/infrastructure/db/db";
import GenericCRUDPage from "@/components/common/GenericCRUDPage";
import { useLiveQuery } from "dexie-react-hooks";

function AssetClassName({ id }: { id: number }) {
  const assetClass = useLiveQuery(() => db.assetClasses.get(id));
  return <span>{assetClass?.name ?? ""}</span>;
}

export default function AssetSubClassPage() {
  return (
    <GenericCRUDPage<AssetSubClass>
      config={{
        title: "Asset Sub Classes",
        tableName: "assetSubClasses",
        columns: [
          { field: "name", headerName: "Name" },
          {
            field: "assetClasses_id",
            headerName: "Asset Class",
            renderCell: (item) => <AssetClassName id={item.assetClasses_id} />
          },
          {
            field: "expectedReturns",
            headerName: "Average Returns (%)",
            renderCell: (item) => `${item.expectedReturns}%`
          }
        ],
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          {
            name: "assetClasses_id",
            label: "Asset Class",
            type: "select",
            required: true,
            optionsQuery: () => db.assetClasses.toArray()
          },
          { name: "expectedReturns", label: "Expected Returns", type: "number", required: true }
        ]
      }}
    />
  );
}
