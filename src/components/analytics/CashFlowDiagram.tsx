import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import { Card, Accordion, ListGroup } from "react-bootstrap";
import { toLocalCurrency } from "@/utils/numberUtils";
import { t } from "@/utils/localization";
import { FINANCIAL_CATEGORIES } from "@/utils/constants";

type TargetNode = {
  key: string;
  name: string;
  color: string;
  value: number;
  type: string;
  targetAccountName?: string;
};

type SourceNode = {
  key: string;
  name: string;
  color: string;
  totalValue: number;
  targets: TargetNode[];
};

export default function CashFlowDiagram() {
  const data = useLiveQuery(async () => {
    const incomes = await db.income.toArray();
    const cashFlows = await db.cashFlow.toArray();
    const purposes = await db.assetPurposes.toArray();
    const goals = await db.goals.toArray();
    const accounts = await db.accounts.toArray();
    const holders = await db.holders.toArray();

    const sourcesMap = new Map<string, SourceNode>();

    cashFlows.forEach((cf) => {
      // Determine Source Node
      let sourceKey = "unassigned-source";
      let sourceName = t.cashFlow.unassignedSource;
      let sourceColor = "#999999";

      if (cf.fromAccountId || cf.income_id) {
        const acc = cf.fromAccountId
          ? accounts.find((a) => a.id === cf.fromAccountId)
          : null;
        const inc = cf.income_id
          ? incomes.find((i) => i.id === cf.income_id)
          : null;

        const holderId = acc?.holders_id || inc?.holders_id;
        const holder = holders.find((h) => h.id === holderId);

        const incAcc = inc
          ? accounts.find((a) => a.id === inc.accounts_id)
          : null;
        const bankName = acc?.bank || incAcc?.bank || t.cashFlow.unknownBank;

        const incItemStr = inc && inc.item ? ` - ${inc.item}` : "";

        sourceKey = `src-${acc?.id || "none"}-${inc?.id || "none"}`;
        sourceName = `${holder?.name || t.cashFlow.unknown} - ${bankName}${incItemStr}`;
        sourceColor = inc ? "#4CAF50" : "#4285F4"; // Green if it has income, Blue otherwise
      }

      let sourceNode = sourcesMap.get(sourceKey);
      if (!sourceNode) {
        sourceNode = {
          key: sourceKey,
          name: sourceName,
          color: sourceColor,
          totalValue: 0,
          targets: [],
        };
        sourcesMap.set(sourceKey, sourceNode);
      }

      // Determine Target Node
      const purpose = purposes.find((p) => p.id === cf.assetPurpose_id);
      let targetColor = "#FFB347"; // Default Orange
      let targetType = "item";

      if (purpose) {
        const pType = purpose.type.toLowerCase();
        if (pType === FINANCIAL_CATEGORIES.NEED) targetColor = "#FF6B6B"; // Red
        else if (pType === FINANCIAL_CATEGORIES.WANT) targetColor = "#FFD166"; // Yellow
        else if (pType === FINANCIAL_CATEGORIES.SAVINGS) targetColor = "#06D6A0"; // Green

        targetType = pType;
      }

      let targetKey = `item-${cf.item}`;
      let targetName = `${cf.item || t.cashFlow.unknown}`;
      let targetAccountName = "";

      if (cf.accounts_id) {
        const tAcc = accounts.find((a) => a.id === cf.accounts_id);
        const tHolder = holders.find((h) => h.id === tAcc?.holders_id);
        if (tAcc) {
          targetAccountName = `${tHolder?.name || t.cashFlow.unknown} - ${tAcc.bank}`;
        }
      }

      if (cf.goal_id) {
        const goal = goals.find((g) => g.id === cf.goal_id);
        targetKey = `goal-${cf.goal_id}`;
        targetName = goal ? `${goal.name}` : t.cashFlow.unknownGoal;
        targetColor = targetColor !== "#FFB347" ? targetColor : "#1ABC9C";
        targetType = targetType !== "item" ? targetType : "goal";
      } else if (
        cf.fromAccountId &&
        cf.accounts_id &&
        cf.fromAccountId !== cf.accounts_id
      ) {
        // Transfer to another bank
        const acc = accounts.find((a) => a.id === cf.accounts_id);
        const holder = holders.find((h) => h.id === acc?.holders_id);
        targetKey = `account-${cf.accounts_id}-${cf.item || ""}`;
        
        if (!cf.item || cf.item.trim() === "") {
          targetName = acc ? `${holder?.name} - ${acc.bank}` : t.cashFlow.unknownBank;
        }
        
        targetColor = targetColor !== "#FFB347" ? targetColor : "#4285F4";
        targetType = targetType !== "item" ? targetType : "transfer";
      }

      const value = Number(cf.monthly || 0);
      const existingTarget = sourceNode.targets.find(
        (t) => t.key === targetKey
      );

      if (existingTarget) {
        existingTarget.value += value;
      } else {
        sourceNode.targets.push({
          key: targetKey,
          name: targetName,
          color: targetColor,
          value: value,
          type: targetType,
          targetAccountName: targetAccountName,
        });
      }

      sourceNode.totalValue += value;
    });

    return Array.from(sourcesMap.values()).sort(
      (a, b) => b.totalValue - a.totalValue
    );
  }, []);

  if (!data || data.length === 0) return null;

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header as="h6">{t.cashFlow.breakdownTitle}</Card.Header>
      <Card.Body className="p-0">
        <Accordion alwaysOpen>
          {data.map((source) => (
            <Accordion.Item
              eventKey={source.key}
              key={source.key}
              className="border-0 border-bottom rounded-0"
            >
              <Accordion.Header>
                <div className="d-flex justify-content-between align-items-center w-100 me-3">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: source.color,
                        flexShrink: 0,
                      }}
                    />
                    <span className="fw-bold">{source.name}</span>
                  </div>
                  <span className="fw-bold text-success ms-2">
                    {toLocalCurrency(source.totalValue)}
                  </span>
                </div>
              </Accordion.Header>
              <Accordion.Body className="p-0 bg-body-tertiary">
                <ListGroup variant="flush">
                  {source.targets
                    .sort((a, b) => b.value - a.value)
                    .map((target) => (
                      <ListGroup.Item
                        key={target.key}
                        className="d-flex justify-content-between align-items-center border-bottom px-3 py-2"
                        style={{ 
                          backgroundColor: `${target.color}25`, // 15% opacity
                          borderLeft: `4px solid ${target.color}`
                        }}
                      >
                        <div className="d-flex align-items-center text-truncate me-2">
                          <div className="d-flex flex-column text-truncate">
                            <span className="text-truncate fw-medium">
                              {target.name}
                            </span>
                            {target.targetAccountName && target.targetAccountName !== target.name && (
                              <span
                                className="text-muted text-truncate"
                                style={{ fontSize: "0.75rem" }}
                              >
                                {target.targetAccountName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <span className="fw-bold mb-0 text-end" style={{ minWidth: "80px", color: "var(--bs-emphasis-color)" }}>
                            {toLocalCurrency(target.value)}
                          </span>
                        </div>
                      </ListGroup.Item>
                    ))}
                </ListGroup>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card.Body>
    </Card>
  );
}
