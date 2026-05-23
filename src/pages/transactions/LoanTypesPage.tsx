import { LoanType } from "@/infrastructure/db/db";
import GenericCRUDPage from "@/components/common/GenericCRUDPage";

export default function LoanTypesPage() {
  return (
    <GenericCRUDPage<LoanType>
      config={{
        title: "Loan Types",
        tableName: "loanTypes",
        columns: [
          { field: "name", headerName: "Name" },
          {
            field: "interestRate",
            headerName: "Interest Rate",
            renderCell: (item) => `${item.interestRate}%`
          }
        ],
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "type", label: "Key", type: "text" },
          { name: "interestRate", label: "Interest Rate", type: "number", required: true }
        ]
      }}
    />
  );
}
