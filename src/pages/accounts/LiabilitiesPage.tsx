import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { Liability } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import { t } from "@/utils/localization";

interface LiabilityFormProps {
  show: boolean;
  onHide: () => void;
  item?: Liability;
  onSave: (item: Liability | Partial<Liability>) => Promise<void>;
}

import FormModal from "@/components/common/FormModal";
import { Form } from "react-bootstrap";
import { toLocalCurrency } from "@/utils/numberUtils";
import AmountInput from "@/components/common/AmountInput";
import FormSelect from "@/components/common/FormSelect";
import { calculateEMI, calculateRemainingBalance } from "@/utils/financialUtils";
import { getDynamicBgClass } from "@/utils/colorUtils";

import { convertToDateInputFormat, convertFromDateInputFormat } from "@/utils/dateUtils";

function LiabilityForm({ item, onSave, onHide, show }: LiabilityFormProps) {
  const [loanType_id, setLoanTypeId] = useState(item?.loanType_id ?? 0);
  const [loanAmount, setLoanAmount] = useState(item?.loanAmount ?? 0);
  const [loanStartDate, setLoanStartDate] = useState(
    item?.loanStartDate ?? ""
  );
  const [totalMonths, setTotalMonths] = useState(item?.totalMonths ?? 0);

  // Update state when item changes
  useEffect(() => {
    if (item) {
      setLoanTypeId(item.loanType_id ?? 0);
      setLoanAmount(item.loanAmount ?? 0);
      setLoanStartDate(item.loanStartDate ?? "");
      setTotalMonths(item.totalMonths ?? 0);
    } else {
      setLoanTypeId(0);
      setLoanAmount(0);
      setLoanStartDate("");
      setTotalMonths(0);
    }
  }, [item]);

  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      loanType_id,
      loanAmount,
      loanStartDate,
      totalMonths,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? t.liabilities.editLiability : t.liabilities.addLiability}
      isValid={!!loanType_id && !!loanStartDate && totalMonths > 0}
    >
      <FormSelect
        controlId="formLiabilityLoanType"
        label={t.liabilities.loanType}
        value={loanType_id}
        onChange={(e) => setLoanTypeId(Number(e.target.value))}
        options={loanTypes.map((t) => ({
          id: t.id!,
          name: `${t.name} (${t.interestRate}%)`,
        }))}
        defaultText="Select Loan Type"
      />
      <Form.Group className="mb-3" controlId="formLiabilityLoanAmount">
        <Form.Label>{t.liabilities.loanAmount}</Form.Label>
        <AmountInput
          value={loanAmount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setLoanAmount(Number(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityLoanStartDate">
        <Form.Label>{t.liabilities.startDate}</Form.Label>
        <Form.Control
          type="date"
          value={convertToDateInputFormat(loanStartDate)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const dateValue = e.target.value;
            setLoanStartDate(convertFromDateInputFormat(dateValue));
          }}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityTotalMonths">
        <Form.Label>{t.liabilities.durationMonths}</Form.Label>
        <Form.Control
          type="number"
          value={totalMonths}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setTotalMonths(Number(e.target.value))
          }
        />
      </Form.Group>
    </FormModal>
  );
}

export default function LiabilitiesPage() {
  const liabilities = useLiveQuery(() => db.liabilities.toArray()) ?? [];
  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleAdd = async (liability: Partial<Liability>) => {
    await db.liabilities.add(liability as Liability);
  };

  const handleEdit = async (liability: Liability) => {
    await db.liabilities.put(liability);
  };

  const handleDelete = async (liability: Liability) => {
    await db.liabilities.delete(liability.id);
  };

  const getLoanTypeName = (id: number) => {
    const type = loanTypes.find((t) => t.id === id);
    return type?.name ?? "";
  };

  const getLoanInterestRate = (id: number) => {
    const type = loanTypes.find((t) => t.id === id);
    return type?.interestRate ?? 0;
  };

  return (
    <BasePage<Liability>
      title={t.liabilities.title}
      data={[...liabilities].sort((a, b) => (a.loanType_id || 0) - (b.loanType_id || 0))}
      groupBy={(item) => {
        const name = getLoanTypeName(item.loanType_id);
        return {
          key: String(item.loanType_id),
          label: name || "Unknown Loan Type"
        };
      }}
      groupSort={(a, b) => Number(a) - Number(b)}
      groupRightLabel={(items) => toLocalCurrency(items.reduce((sum, item) => sum + item.loanAmount, 0))}
      columns={[
        {
          field: "loanAmount",
          headerName: t.liabilities.loanAmount,
          renderCell: (item) => toLocalCurrency(item.loanAmount),
        },
        {
          field: "balance" as keyof Liability, // Virtual field
          headerName: t.liabilities.outstandingBalance,
          renderCell: (item) => {
            const rate = getLoanInterestRate(item.loanType_id);
            const balance = calculateRemainingBalance(
              item.loanAmount,
              rate,
              item.totalMonths,
              item.loanStartDate
            );
            return toLocalCurrency(balance);
          },
        },
        {
          field: "emi" as keyof Liability, // Virtual field
          headerName: t.liabilities.emi,
          renderCell: (item) => {
            const rate = getLoanInterestRate(item.loanType_id);
            const emi = calculateEMI(item.loanAmount, rate, item.totalMonths);
            return toLocalCurrency(emi);
          },
        },
        {
          field: "loanStartDate",
          headerName: t.liabilities.startDate,
          renderCell: (item) => item.loanStartDate || "-",
        },
        {
          field: "totalMonths",
          headerName: t.liabilities.durationMonths,
          renderCell: (item) => item.totalMonths || "-",
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={LiabilityForm}
      getRowClassName={(item) => getDynamicBgClass(item.loanType_id)}
    />
  );
}
