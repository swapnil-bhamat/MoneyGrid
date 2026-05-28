import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import type { CashFlow } from "@/infrastructure/db/db";
import BasePage from "@/components/layout/BasePage";
import FormModal from "@/components/common/FormModal";
import { Form, Card, Row, Col, Button, Modal } from "react-bootstrap";
import { toLocalCurrency } from "@/utils/numberUtils";
import AmountInput from "@/components/common/AmountInput";
import FormSelect from "@/components/common/FormSelect";
import { FaInfoCircle } from "react-icons/fa";
import { getDynamicBgClass } from "@/utils/colorUtils";
import { t } from "@/utils/localization";

interface CashFlowFormProps {
  show: boolean;
  onHide: () => void;
  item?: CashFlow;
  onSave: (item: CashFlow | Partial<CashFlow>) => Promise<void>;
}

function CashFlowForm({ item, onSave, onHide, show }: CashFlowFormProps) {
  const [item_name, setItemName] = useState(item?.item ?? "");
  const [accounts_id, setAccountsId] = useState(item?.accounts_id ?? 0);
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const [monthly, setMonthly] = useState(item?.monthly ?? 0);
  const [yearly, setYearly] = useState(item?.yearly ?? 0);
  const [assetPurpose_id, setAssetPurposeId] = useState(
    item?.assetPurpose_id ?? 0
  );
  const [goal_id, setGoalId] = useState(item?.goal_id ?? null);
  const [income_id, setIncomeId] = useState(item?.income_id ?? null);
  const [fromAccountId, setFromAccountId] = useState(item?.fromAccountId ?? null);
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const incomes = useLiveQuery(() => db.income.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      item: item_name,
      accounts_id,
      holders_id,
      monthly,
      yearly,
      assetPurpose_id,
      goal_id: goal_id === 0 ? null : goal_id,
      income_id: income_id === 0 ? null : income_id,
      fromAccountId: fromAccountId === 0 ? null : fromAccountId,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? t.cashFlow.editFlow : t.cashFlow.addFlow}
      isValid={!!item_name}
    >
      <Form.Group className="mb-3" controlId="formItem">
        <Form.Label>{t.cashFlow.flowItem}</Form.Label>
        <Form.Control
          type="text"
          value={item_name}
          autoFocus
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setItemName(e.target.value)
          }
        />
      </Form.Group>
      <FormSelect
        controlId="formHolder"
        label={t.income.holder || "Holder"}
        value={holders_id}
        onChange={(e) => {
          setHoldersId(Number(e.target.value));
          setAccountsId(0);
        }}
        options={holders}
        defaultText={t.common.selectHolder || "Select Holder"}
      />

      <FormSelect
        controlId="formFromAccount"
        label={`${t.cashFlow.transferFrom || "From Account"} (${t.common.optional || "optional"})`}
        value={fromAccountId ?? 0}
        onChange={(e) => setFromAccountId(Number(e.target.value))}
        options={accounts.map((acc) => {
          const holder = holders.find(h => h.id === acc.holders_id);
          return { id: acc.id!, name: `${acc.bank} (${holder?.name || t.common.unknown || 'Unknown'})` };
        })}
        defaultText={`${t.common.select || "Select"} ${t.cashFlow.transferFrom || "From Account"} (${t.common.optional || "Optional"})`}
      />

      <FormSelect
        controlId="formAccount"
        label={t.cashFlow.toAccount || "To Account"}
        value={accounts_id}
        onChange={(e) => setAccountsId(Number(e.target.value))}
        options={accounts.map((acc) => {
          const holder = holders.find(h => h.id === acc.holders_id);
          return { id: acc.id!, name: `${acc.bank} (${holder?.name || t.common.unknown || 'Unknown'})` };
        })}
        defaultText={`${t.common.select || "Select"} ${t.cashFlow.toAccount || "To Account"}`}
      />

      <Form.Group className="mb-3" controlId="formMonthly">
        <Form.Label>{t.cashFlow.monthlyAmount}</Form.Label>
        <AmountInput
          value={monthly}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setMonthly(Number(e.target.value));
            setYearly(Number(e.target.value) * 12);
          }}
        />
      </Form.Group>

      <FormSelect
        controlId="formAssetPurpose"
        label={t.cashFlow.assetPurpose || "Asset Purpose"}
        value={assetPurpose_id}
        onChange={(e) => setAssetPurposeId(Number(e.target.value))}
        options={assetPurposes}
        defaultText={t.common.selectAssetPurpose || "Select Asset Purpose"}
      />

      <FormSelect
        controlId="formGoal"
        label={`${t.assets.goal || "Goal"} (${t.common.optional || "optional"})`}
        value={goal_id ?? 0}
        onChange={(e) => setGoalId(Number(e.target.value))}
        options={goals}
        defaultText={t.common.selectGoal || "Select Goal (Optional)"}
      />

      <FormSelect
        controlId="formIncome"
        label={`${t.income.incomeSource || "Income Source"} (${t.common.optional || "optional"})`}
        value={income_id ?? 0}
        onChange={(e) => setIncomeId(Number(e.target.value))}
        options={incomes.map((inc) => {
          const holder = holders.find(h => h.id === inc.holders_id);
          return { id: inc.id!, name: `${inc.item} (${holder?.name || t.common.unknown || 'Unknown'})` };
        })}
        defaultText={t.common.selectIncomeSource || "Select Income Source (Optional)"}
      />

    </FormModal>
  );
}

export default function CashFlowPage() {
  const [showModal, setShowModal] = useState(false);
  const cashFlows = useLiveQuery(() => db.cashFlow.toArray()) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const monthlyIncomes = useLiveQuery(() => db.income.toArray()) ?? [];
  const getGoalName = (id: number | null | undefined) => {
    if (!id) return "";
    const goal = goals.find((g) => g.id === id);
    return goal?.name ?? "";
  };

  const getIncomeName = (id: number | null | undefined) => {
    if (!id) return "";
    const inc = monthlyIncomes.find((i) => i.id === id);
    return inc?.item ?? "";
  };

  const handleAdd = async (cashFlow: Partial<CashFlow>) => {
    await db.cashFlow.add(cashFlow as CashFlow);
  };

  const handleEdit = async (cashFlow: CashFlow) => {
    await db.cashFlow.put(cashFlow);
  };

  const handleDelete = async (cashFlow: CashFlow) => {
    await db.cashFlow.delete(cashFlow.id);
  };


  const getFullAccountName = (id: number | null | undefined) => {
    if (!id) return "";
    const account = accounts.find((a) => a.id === id);
    if (!account) return "";
    const holder = holders.find((h) => h.id === account.holders_id);
    return `${account.bank} (${holder?.name || t.common.unknown || "Unknown"})`;
  };

  const getHolderName = (id: number) => {
    const holder = holders.find((h) => h.id === id);
    return holder?.name ?? "";
  };

  const getAssetPurposeName = (id: number) => {
    const purpose = assetPurposes.find((p) => p.id === id);
    return purpose?.name ?? "";
  };

  // Calculate totals
  const totalMonthlyIncome = monthlyIncomes.reduce(
    (sum, inc) => sum + parseFloat(String(inc.monthly)),
    0
  );

  const totalAllocated = cashFlows
    .filter((flow) => flow.assetPurpose_id)
    .reduce((sum, flow) => sum + parseFloat(String(flow.monthly)), 0);
  const gap = totalMonthlyIncome - totalAllocated;

  return (
    <>
      <BasePage<CashFlow>
        title={t.cashFlow.title}
        data={[...cashFlows].sort((a, b) => (a.holders_id || 0) - (b.holders_id || 0))}
        groupBy={(item) => {
          const name = getHolderName(item.holders_id);
          return {
            key: String(item.holders_id),
            label: name || t.common.unknown || "Unknown Holder"
          };
        }}
        groupSort={(a, b) => Number(a) - Number(b)}
        groupRightLabel={(items) => toLocalCurrency(items.reduce((sum, item) => sum + Number(item.monthly), 0))}
        columns={[
          { field: "item", headerName: t.cashFlow.flowItem },
          {
            field: "fromAccountId",
            headerName: t.cashFlow.transferFrom,
            renderCell: (item) => getFullAccountName(item.fromAccountId),
          },
          {
            field: "accounts_id",
            headerName: t.cashFlow.toAccount || "To Account",
            renderCell: (item) => getFullAccountName(item.accounts_id),
          },
          {
            field: "monthly",
            headerName: t.cashFlow.monthlyAmount,
            renderCell: (item) => toLocalCurrency(item.monthly),
          },
          {
            field: "assetPurpose_id",
            headerName: t.cashFlow.assetPurpose || "Asset Purpose",
            renderCell: (item) => getAssetPurposeName(item.assetPurpose_id),
          },
          {
            field: "income_id",
            headerName: t.cashFlow.incomeLink,
            renderCell: (item) => getIncomeName(item.income_id),
          },
          {
            field: "goal_id",
            headerName: t.cashFlow.goalLink,
            renderCell: (item) => getGoalName(item.goal_id),
          },
        ]}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        FormComponent={CashFlowForm}
        getRowClassName={(item) => getDynamicBgClass(item.holders_id)}
        extraActions={
          <Button
            variant={gap === 0 ? "outline-success" : "outline-danger"}
            className="d-flex align-items-center gap-1 px-3"
            onClick={() => setShowModal(true)}
          >
            <FaInfoCircle size={20} />
          </Button>
        }
      />
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t.cashFlow.allocationGap || "Allocation Gap?"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-2">
            <Col md={4} className="mb-2">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>{t.cashFlow.totalInflow}</Card.Title>
                  <Card.Text className="h4 text-primary">
                    {toLocalCurrency(totalMonthlyIncome)}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-2">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>{t.cashFlow.totalOutflow}</Card.Title>
                  <Card.Text className="h4 text-info">
                    {toLocalCurrency(totalAllocated)}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-2">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>{t.cashFlow.netSavings}</Card.Title>
                  <Card.Text
                    className={`h4 ${
                      gap === 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {toLocalCurrency(gap)}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    </>
  );
}
