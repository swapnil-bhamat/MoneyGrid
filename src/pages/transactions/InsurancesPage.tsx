import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { Insurance } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";
import { Form } from "react-bootstrap";
import { toLocalCurrency } from "@/utils/numberUtils";
import AmountInput from "@/components/common/AmountInput";
import FormSelect from "@/components/common/FormSelect";
import { getDynamicBgClass } from "@/utils/colorUtils";

// Helper function to convert DD-MM-YYYY to YYYY-MM-DD for date input
function convertToDateInputFormat(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Helper function to convert YYYY-MM-DD to DD-MM-YYYY for storage
function convertFromDateInputFormat(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
}

interface InsuranceFormProps {
  show: boolean;
  onHide: () => void;
  item?: Insurance;
  onSave: (item: Insurance | Partial<Insurance>) => Promise<void>;
}

function InsuranceForm({ item, onSave, onHide, show }: InsuranceFormProps) {
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const [insuranceType_id, setInsuranceTypeId] = useState(item?.insuranceType_id ?? 0);
  const [premiumYearly, setPremiumYearly] = useState(item?.premiumYearly ?? 0);
  const [sumAssured, setSumAssured] = useState(item?.sumAssured ?? 0);
  const [startDate, setStartDate] = useState(item?.startDate ?? "");
  const [endDate, setEndDate] = useState(item?.endDate ?? "");
  const [renewDate, setRenewDate] = useState(item?.renewDate ?? "");
  const [description, setDescription] = useState(item?.description ?? "");

  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const insuranceTypes = useLiveQuery(() => db.insuranceTypes.toArray()) ?? [];

  useEffect(() => {
    if (item) {
      setHoldersId(item.holders_id);
      setInsuranceTypeId(item.insuranceType_id);
      setPremiumYearly(item.premiumYearly);
      setSumAssured(item.sumAssured);
      setStartDate(item.startDate);
      setEndDate(item.endDate);
      setRenewDate(item.renewDate);
      setDescription(item.description);
    } else {
      setHoldersId(0);
      setInsuranceTypeId(0);
      setPremiumYearly(0);
      setSumAssured(0);
      setStartDate("");
      setEndDate("");
      setRenewDate("");
      setDescription("");
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      holders_id,
      insuranceType_id,
      premiumYearly,
      sumAssured,
      startDate,
      endDate,
      renewDate,
      description,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Insurance" : "Add Insurance"}
      isValid={!!holders_id && !!insuranceType_id && premiumYearly >= 0}
    >
      <FormSelect
        controlId="formInsuranceHolder"
        label="Holder"
        value={holders_id}
        onChange={(e) => setHoldersId(Number(e.target.value))}
        options={holders.map((h) => ({ id: h.id!, name: h.name }))}
        defaultText="Select Holder"
      />
      <FormSelect
        controlId="formInsuranceType"
        label="Insurance Type"
        value={insuranceType_id}
        onChange={(e) => setInsuranceTypeId(Number(e.target.value))}
        options={insuranceTypes.map((t) => ({ id: t.id!, name: t.name }))}
        defaultText="Select Type"
      />
      <Form.Group className="mb-3" controlId="formInsurancePremium">
        <Form.Label>Premium (Yearly)</Form.Label>
        <AmountInput
          value={premiumYearly}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPremiumYearly(Number(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formInsuranceSumAssured">
        <Form.Label>Sum Assured</Form.Label>
        <AmountInput
          value={sumAssured}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSumAssured(Number(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formInsuranceStartDate">
        <Form.Label>Start Date</Form.Label>
        <Form.Control
          type="date"
          value={convertToDateInputFormat(startDate)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setStartDate(convertFromDateInputFormat(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formInsuranceEndDate">
        <Form.Label>End Date</Form.Label>
        <Form.Control
          type="date"
          value={convertToDateInputFormat(endDate)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEndDate(convertFromDateInputFormat(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formInsuranceRenewDate">
        <Form.Label>Renew Date</Form.Label>
        <Form.Control
          type="date"
          value={convertToDateInputFormat(renewDate)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setRenewDate(convertFromDateInputFormat(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formInsuranceDescription">
        <Form.Label>Description</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          value={description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setDescription(e.target.value)
          }
        />
      </Form.Group>
    </FormModal>
  );
}

export default function InsurancesPage() {
  const insurances = useLiveQuery(() => db.insurances.toArray()) ?? [];
  const insuranceTypes = useLiveQuery(() => db.insuranceTypes.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (insurance: Partial<Insurance>) => {
    await db.insurances.add(insurance as Insurance);
  };

  const handleEdit = async (insurance: Insurance) => {
    await db.insurances.put(insurance);
  };

  const handleDelete = async (insurance: Insurance) => {
    await db.insurances.delete(insurance.id);
  };

  const getInsuranceTypeName = (id: number) => {
    return insuranceTypes.find((t) => t.id === id)?.name ?? "Unknown";
  };

  const getHolderName = (id: number) => {
    return holders.find((h) => h.id === id)?.name ?? "Unknown";
  };

  return (
    <BasePage<Insurance>
      title="Insurances"
      data={[...insurances].sort((a, b) => a.insuranceType_id - b.insuranceType_id)}
      groupBy={(item) => ({
        key: String(item.insuranceType_id),
        label: getInsuranceTypeName(item.insuranceType_id),
      })}
      groupRightLabel={(items) => toLocalCurrency(items.reduce((sum, item) => sum + item.premiumYearly, 0))}
      columns={[
        {
          field: "holders_id",
          headerName: "Holder",
          renderCell: (item) => getHolderName(item.holders_id),
        },
        {
          field: "premiumYearly",
          headerName: "Premium (Yearly)",
          renderCell: (item) => toLocalCurrency(item.premiumYearly),
        },
        {
          field: "sumAssured",
          headerName: "Sum Assured",
          renderCell: (item) => toLocalCurrency(item.sumAssured),
        },
        {
          field: "renewDate",
          headerName: "Renew Date",
          renderCell: (item) => item.renewDate || "-",
        },
        {
          field: "description",
          headerName: "Description",
          renderCell: (item) => item.description || "-",
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={InsuranceForm}
      getRowClassName={(item) => getDynamicBgClass(item.insuranceType_id)}
    />
  );
}
