import React, { useState } from "react";
import {
  Modal,
  Button,
  Form,
  Alert,
  Badge,
  Card,
  Row,
  Col,
  Table,
  Spinner,
  Accordion,
} from "react-bootstrap";
import {
  BsCloudUpload,
  BsCheckCircleFill,
  BsArrowRepeat,
  BsShieldCheck,
  BsDownload,
  BsInfoCircle,
  BsClipboard,
  BsClipboardCheck,
  BsPeople,
} from "react-icons/bs";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import {
  parseINDMoneyPayload,
  generateReconciliationDiff,
  applyINDMoneyReconciliation,
} from "@/services/indmoneyMapper";
import { ReconciliationResult, INDMoneyPayload } from "@/types/indmoney.types";
import { toLocalCurrency } from "@/utils/numberUtils";
import { exportDataFromIndexedDB } from "@/services/driveSync";
import { historyService } from "@/services/historyService";

interface INDMoneySyncModalProps {
  show: boolean;
  onHide: () => void;
}

const GENERIC_CLAUDE_PROMPT = `Use the INDmoney MCP tools to fetch my complete portfolio for every family member linked to my account, then return it as ONE valid JSON object. Output only the JSON: no commentary, no markdown fences, no comments.

OPTIONAL OVERRIDES (delete if not needed): relation labels from INDmoney can be wrong. Use these instead: {"<member name>": "<spouse|parent|child|sibling|other>"}

HOW TO FETCH (fetch fresh every time; never reuse earlier numbers):
1. get_family_members: get every member's name. The member with is_you=true is "self" and is_family_head per the tool. Skip members who do not share their portfolio; never invent data for them.
2. networth_snapshot for each member (pass family_member for non-self members): totals and liabilities (loans, credit cards with due dates, bills).
3. get_family_asset_holdings with asset="mutual_fund", then again with asset="gold". Gold is NOT available through networth_holdings.
4. networth_holdings for each member with asset_type EPF, NPS, FD, SA, RE and IND_STOCK. Skip a type when the snapshot shows 0 for it.
5. Use exact values returned by the tools. Never estimate, round, or invent a number. If a call fails, set that section's holdings to [] and total to 0, keeping the schema shape.

RULES:
- fetched_on = today's date (YYYY-MM-DD). Amounts are rupees as decimals.
- Keys: member_1 = self, then member_2, member_3 and so on in the order INDmoney returns them.
- Include every asset key for every member. Use total_value 0 and "holdings": [] when a member holds none.
- Each member's totals come from their snapshot: invested = total_invested, current_value = total_current_value, net_worth = current_value minus liabilities total (loans + credit card dues + bills).
- family.summary: total_invested and total_current_value are sums across members. total_liabilities is the sum of each member's liabilities. net_worth = total_current_value minus total_liabilities.
- Keep duplicate rows exactly as returned (for example two identical FDs). Do not merge them.
- savings_account and real_estate holdings have no invested field. Credit cards without a due date get due_date null.
- Never output account numbers, folio numbers, PINs or credentials. Card names keep only the last 4 digits INDmoney provides.

GOLD PURITY (add to every gold holding):
Compute "purity" and "purity_basis" in this order:
 a) If the holding's name says 24K, 22K, 18K, 14K (or 999, 916, 750, 585), use that purity with purity_basis "name".
 b) Otherwise find the 24K reference rate per gram:
    - if any holding is explicitly named 24K/999/bar/coin, use its unit_price;
    - else, if there are at least TWO distinct unit_price values across the member's gold holdings, use the highest;
    - else there is no reference: set purity null and purity_basis "unknown".
 c) With a reference rate, ratio = unit_price / reference_rate. Match: about 1.0 -> "24K", about 0.9167 -> "22K", about 0.75 -> "18K", about 0.5833 -> "14K", each within ±0.03. Use purity_basis "price_ratio". If nothing matches, purity null and purity_basis "unknown".
Never guess a purity that fails these rules, and never change any amount.

SCHEMA (same keys and order):
{"meta":{"source":"INDmoney connector (Claude)","fetched_on":"YYYY-MM-DD","currency":"INR","amount_unit":"rupees (decimal)"},
"family":{"members":[{"key":"member_1","name":"","relation_to_user":"self","is_family_head":true},{"key":"member_2","name":"","relation_to_user":"spouse|parent|child|sibling|other","is_family_head":false}],
"summary":{"total_invested":0,"total_current_value":0,"total_liabilities":0,"net_worth":0}},
"members":{"<member_key>":{"totals":{"invested":0,"current_value":0,"net_worth":0},
"assets":{
"mutual_fund":{"total_value":0,"invested":0,"holdings":[{"scheme_id":"","name":"","asset_class":"equity|debt","invested_amount":0.0,"current_value":0.0,"quantity":0.0,"unit_price":0.0}]},
"epf":{"total_value":0,"invested":0,"holdings":[{"name":"","invested_amount":0.0,"market_value":0.0}]},
"nps":{"total_value":0,"invested":0,"holdings":[{"name":"","invested_amount":0.0,"market_value":0.0}]},
"fixed_deposit":{"total_value":0,"invested":0,"holdings":[{"name":"","invested_amount":0.0,"market_value":0.0}]},
"savings_account":{"total_value":0,"holdings":[{"name":"","market_value":0.0}]},
"indian_stock":{"total_value":0,"invested":0,"holdings":[{"name":"","quantity":0,"market_value":0.0,"invested_amount":0.0}]},
"real_estate":{"total_value":0,"holdings":[{"name":"","market_value":0.0}]},
"gold":{"total_value":0,"invested":0,"holdings":[{"name":"","purity":"24K|22K|18K|14K|null","purity_basis":"name|price_ratio|unknown","quantity":0,"avg_buy_price":0.0,"unit_price":0.0,"invested_amount":0.0,"current_value":0.0}]}},
"liabilities":{"loans":[{"lender":"","loan_type":"","current_balance":0.0}],"credit_cards":[{"name":"","total_due":0.0,"due_date":"YYYY-MM-DD|null"}],"bills":[{"name":"","amount":0.0}]}}}}`;

export const INDMoneySyncModal: React.FC<INDMoneySyncModalProps> = ({
  show,
  onHide,
}) => {
  const [jsonText, setJsonText] = useState("");
  const [parsedPayload, setParsedPayload] = useState<INDMoneyPayload | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<ReconciliationResult | null>(
    null,
  );
  const [isApplying, setIsApplying] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [customHolderMap, setCustomHolderMap] = useState<
    Record<string, number>
  >({});
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [syncSuccess, setSyncSuccess] = useState<{
    updated: number;
    added: number;
  } | null>(null);

  const holdings = useLiveQuery(() => db.assetsHoldings.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const assetSubClasses =
    useLiveQuery(() => db.assetSubClasses.toArray()) ?? [];
  const liabilities = useLiveQuery(() => db.liabilities.toArray()) ?? [];
  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(GENERIC_CLAUDE_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJsonText(text);
      processJsonText(text);
    };
    reader.readAsText(file);
  };

  const processJsonText = (
    text: string,
    overrideHolderMap?: Record<string, number>,
  ) => {
    setErrorMsg(null);
    setSyncSuccess(null);
    try {
      const payload = parseINDMoneyPayload(text);
      setParsedPayload(payload);
      const activeMap = overrideHolderMap || customHolderMap;
      const result = generateReconciliationDiff(
        payload,
        holdings,
        holders,
        assetSubClasses,
        activeMap,
        liabilities,
        loanTypes,
      );
      setDiffResult(result);
    } catch (err) {
      setErrorMsg((err as Error).message || "Failed to parse INDmoney JSON.");
      setDiffResult(null);
      setParsedPayload(null);
    }
  };

  const handleHolderMappingChange = (
    memberKey: string,
    newHolderId: number,
  ) => {
    const updatedMap = {
      ...customHolderMap,
      [memberKey]: newHolderId,
    };
    setCustomHolderMap(updatedMap);
    if (parsedPayload) {
      const result = generateReconciliationDiff(
        parsedPayload,
        holdings,
        holders,
        assetSubClasses,
        updatedMap,
        liabilities,
        loanTypes,
      );
      setDiffResult(result);
    }
  };

  const handleToggleItem = (id: string) => {
    if (!diffResult) return;
    const updatedItems = diffResult.items.map((item) =>
      item.id === id ? { ...item, selected: !item.selected } : item,
    );
    setDiffResult({
      ...diffResult,
      items: updatedItems,
    });
  };

  const handleToggleAllUpdates = (selectAll: boolean) => {
    if (!diffResult) return;
    const updatedItems = diffResult.items.map((item) => {
      if (item.status === "update" || item.status === "new") {
        return { ...item, selected: selectAll };
      }
      return item;
    });
    setDiffResult({
      ...diffResult,
      items: updatedItems,
    });
  };

  const handleApply = async () => {
    if (!diffResult) return;
    setIsApplying(true);
    setErrorMsg(null);

    try {
      // Snapshot current state for undo
      historyService.trackOperation({
        type: "update",
        table: "assetsHoldings",
        key: "batch-sync",
        data: holdings,
      });

      const { updatedCount, addedCount, updatedLiabilitiesCount } =
        await applyINDMoneyReconciliation(
          diffResult.items,
          holdings,
          customHolderMap,
          liabilities,
        );

      setSyncSuccess({
        updated: updatedCount + updatedLiabilitiesCount,
        added: addedCount,
      });
    } catch (err) {
      setErrorMsg("Failed to apply updates: " + (err as Error).message);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDownloadUpdatedData = async () => {
    try {
      const data = await exportDataFromIndexedDB();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export: " + (err as Error).message);
    }
  };

  const handleReset = () => {
    setJsonText("");
    setParsedPayload(null);
    setDiffResult(null);
    setErrorMsg(null);
    setSyncSuccess(null);
    setCustomHolderMap({});
    setActiveFilter("all");
  };

  const handleClose = () => {
    handleReset();
    onHide();
  };

  // Group diff items for display
  const allActionableItems =
    diffResult?.items.filter(
      (i) => i.status === "update" || i.status === "new",
    ) || [];
  const updateItems =
    diffResult?.items.filter((i) => i.status === "update") || [];
  const newItems = diffResult?.items.filter((i) => i.status === "new") || [];
  const unchangedItems =
    diffResult?.items.filter((i) => i.status === "unchanged") || [];
  const appOnlyItems =
    diffResult?.items.filter((i) => i.status === "app_only") || [];

  // Filter items by selected category
  const filteredActionableItems = allActionableItems.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "mutual_fund") return item.category === "mutual_fund";
    if (activeFilter === "gold") return item.category === "gold";
    if (activeFilter === "retirement")
      return (
        item.category === "retirement" || item.category === "fixed_deposit"
      );
    if (activeFilter === "savings_account")
      return item.category === "savings_account";
    if (activeFilter === "stock") return item.category === "stock";
    return true;
  });

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered scrollable>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="d-flex align-items-center gap-2 fs-5">
          <BsArrowRepeat className="text-primary" />
          <span>
            Sync Portfolio from INDmoney (Authoritative Data Reconciler)
          </span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 bg-body-tertiary">
        {errorMsg && (
          <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)}>
            ⚠️ {errorMsg}
          </Alert>
        )}

        {syncSuccess ? (
          <div className="text-center py-5">
            <BsCheckCircleFill className="text-success mb-3" size={60} />
            <h4 className="fw-bold">Portfolio Updated Successfully!</h4>
            <p className="text-muted mb-4">
              {syncSuccess.updated} existing holdings updated, and{" "}
              {syncSuccess.added} new holdings created in your local database.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Button
                variant="outline-primary"
                onClick={handleDownloadUpdatedData}
              >
                <BsDownload className="me-2" />
                Download Updated data.json
              </Button>
              <Button variant="primary" onClick={handleClose}>
                Done & Return to App
              </Button>
            </div>
          </div>
        ) : !diffResult ? (
          <div>
            <div className="bg-body p-4 rounded-3 border mb-4 text-center">
              <BsCloudUpload size={48} className="text-primary mb-3" />
              <h5>Load INDmoney Portfolio Export</h5>
              <p className="text-muted small mb-4">
                Upload your JSON export pulled from Claude AI via the INDmoney
                MCP connector. Syncs live authenticated values & units across
                Mutual Funds, Gold, EPF, NPS, Fixed Deposits, and Bank Balances.
              </p>

              <div className="d-flex justify-content-center gap-3">
                <Button variant="primary" as="label">
                  Choose JSON File
                  <input
                    type="file"
                    hidden
                    accept=".json"
                    onChange={handleFileUpload}
                  />
                </Button>
              </div>
            </div>

            <div className="bg-body p-4 rounded-3 border mb-4">
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">
                  Or Paste JSON Directly
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  placeholder="Paste your INDmoney JSON here..."
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="font-monospace small"
                />
              </Form.Group>
              <div className="d-flex justify-content-end">
                <Button
                  variant="outline-primary"
                  disabled={!jsonText.trim()}
                  onClick={() => processJsonText(jsonText)}
                >
                  Analyze & Compare Portfolio
                </Button>
              </div>
            </div>

            {/* Standard Generic Claude Prompt Box with 1-Click Copy */}
            <Card className="border">
              <Card.Header className="bg-body d-flex justify-content-between align-items-center py-2 px-3">
                <div className="d-flex align-items-center gap-2">
                  <BsInfoCircle className="text-primary" />
                  <span className="fw-semibold">
                    Claude AI Prompt Template (Generic & Repeatable)
                  </span>
                </div>
                <Button
                  variant={copiedPrompt ? "success" : "outline-primary"}
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="d-flex align-items-center gap-1"
                >
                  {copiedPrompt ? (
                    <>
                      <BsClipboardCheck /> Copied!
                    </>
                  ) : (
                    <>
                      <BsClipboard /> Copy Prompt
                    </>
                  )}
                </Button>
              </Card.Header>
              <Card.Body className="p-3 bg-body-secondary small">
                <p className="text-muted mb-2">
                  Copy and paste this standard prompt into Claude AI with the
                  INDmoney MCP connector. It instructs Claude to output strictly
                  formatted JSON that matches this app’s reconciler every time:
                </p>
                <pre
                  className="p-3 bg-dark text-light rounded small user-select-all mb-0"
                  style={{ maxHeight: "220px", overflowY: "auto" }}
                >
                  {GENERIC_CLAUDE_PROMPT}
                </pre>
              </Card.Body>
            </Card>
          </div>
        ) : (
          <div>
            {/* Family Member Mapping Card (Generic & Configurable) */}
            {diffResult.detectedMembers.length > 0 && (
              <Card className="border-0 shadow-sm bg-body mb-3">
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <BsPeople className="text-primary" />
                    <span className="fw-semibold">Family Member Mapping</span>
                    <small className="text-muted">
                      (Align INDmoney members with local app holders)
                    </small>
                  </div>
                  <Row className="g-2">
                    {diffResult.detectedMembers.map((member) => (
                      <Col xs={12} sm={6} md={4} key={member.key}>
                        <div className="d-flex align-items-center gap-2 bg-body-secondary p-2 rounded border">
                          <div className="flex-grow-1">
                            <div className="fw-semibold small">
                              {member.name}
                            </div>
                            <small className="text-muted">
                              Key: {member.key}
                            </small>
                          </div>
                          <div style={{ minWidth: "130px" }}>
                            <Form.Select
                              size="sm"
                              value={
                                customHolderMap[member.key] !== undefined
                                  ? customHolderMap[member.key]
                                  : member.resolvedHolderId
                              }
                              onChange={(e) =>
                                handleHolderMappingChange(
                                  member.key,
                                  Number(e.target.value),
                                )
                              }
                            >
                              {holders.map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.name}
                                </option>
                              ))}
                            </Form.Select>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* KPI Summary Cards */}
            <Row className="g-3 mb-3">
              <Col xs={12} sm={6} md={3}>
                <Card className="border-0 shadow-sm h-100 bg-body">
                  <Card.Body className="p-3">
                    <div className="text-muted small">Current Total Assets</div>
                    <div className="fs-5 fw-bold mt-1">
                      {toLocalCurrency(diffResult.summary.totalExisting)}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Card className="border-0 shadow-sm h-100 bg-body">
                  <Card.Body className="p-3">
                    <div className="text-muted small">Total After Sync</div>
                    <div className="fs-5 fw-bold mt-1 text-primary">
                      {toLocalCurrency(diffResult.summary.totalUpdated)}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Card className="border-0 shadow-sm h-100 bg-body">
                  <Card.Body className="p-3">
                    <div className="text-muted small">Net Portfolio Change</div>
                    <div
                      className={`fs-5 fw-bold mt-1 ${
                        diffResult.summary.totalDelta >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {diffResult.summary.totalDelta >= 0 ? "+" : ""}
                      {toLocalCurrency(diffResult.summary.totalDelta)}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Card className="border-0 shadow-sm h-100 bg-body">
                  <Card.Body className="p-3">
                    <div className="text-muted small">Updates Status</div>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <Badge bg="warning" text="dark">
                        {updateItems.length} Updates
                      </Badge>
                      {newItems.length > 0 && (
                        <Badge bg="success">{newItems.length} New</Badge>
                      )}
                      {unchangedItems.length > 0 && (
                        <Badge bg="light" text="dark">
                          {unchangedItems.length} Identical
                        </Badge>
                      )}
                      <Badge bg="secondary">
                        {appOnlyItems.length} Untouched
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Category Filter Tabs */}
            <div className="d-flex flex-wrap gap-2 mb-3">
              {[
                {
                  key: "all",
                  label: `All Actionable (${allActionableItems.length})`,
                },
                {
                  key: "mutual_fund",
                  label: `Mutual Funds (${allActionableItems.filter((i) => i.category === "mutual_fund").length})`,
                },
                {
                  key: "gold",
                  label: `Gold (${allActionableItems.filter((i) => i.category === "gold").length})`,
                },
                {
                  key: "retirement",
                  label: `EPF, NPS & FD (${allActionableItems.filter((i) => i.category === "retirement" || i.category === "fixed_deposit").length})`,
                },
                {
                  key: "savings_account",
                  label: `Bank Accounts (${allActionableItems.filter((i) => i.category === "savings_account").length})`,
                },
                {
                  key: "stock",
                  label: `Stocks (${allActionableItems.filter((i) => i.category === "stock").length})`,
                },
                {
                  key: "liability",
                  label: `Liabilities (${allActionableItems.filter((i) => i.category === "liability").length})`,
                },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  size="sm"
                  variant={
                    activeFilter === tab.key ? "primary" : "outline-secondary"
                  }
                  onClick={() => setActiveFilter(tab.key)}
                  className="rounded-pill px-3"
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Reconciliation Review Table */}
            <Card className="border shadow-sm mb-3">
              <Card.Header className="bg-body d-flex flex-wrap justify-content-between align-items-center py-2 px-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">
                    Authoritative Updates from INDmoney
                  </span>
                  <Badge bg="primary">{filteredActionableItems.length}</Badge>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleToggleAllUpdates(true)}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleToggleAllUpdates(false)}
                  >
                    Deselect All
                  </Button>
                </div>
              </Card.Header>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 table-sm">
                  <thead className="table-light small">
                    <tr>
                      <th style={{ width: 40 }} className="text-center">
                        ✓
                      </th>
                      <th>Holder</th>
                      <th>Asset / Scheme</th>
                      <th>Category</th>
                      <th>Units / Qty</th>
                      <th className="text-end">Current Value</th>
                      <th className="text-end">Authoritative Value</th>
                      <th className="text-end">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActionableItems.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          !item.selected
                            ? "opacity-50"
                            : item.status === "new"
                              ? "table-success bg-opacity-10"
                              : ""
                        }
                      >
                        <td className="text-center">
                          <Form.Check
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleItem(item.id)}
                          />
                        </td>
                        <td>
                          <Badge bg="info" className="text-dark">
                            {item.holderName}
                          </Badge>
                        </td>
                        <td>
                          <div className="fw-semibold">
                            {item.status === "new" && "✨ "}
                            {item.assetName}
                          </div>
                          {item.schemeCode && (
                            <small className="text-muted d-block">
                              Scheme ID: {item.schemeCode}
                            </small>
                          )}
                          {item.investedAmount !== undefined &&
                            item.investedAmount > 0 && (
                              <small className="text-muted d-block">
                                Invested: {toLocalCurrency(item.investedAmount)}
                                {item.nav
                                  ? ` · NAV: ₹${item.nav.toFixed(2)}`
                                  : ""}
                              </small>
                            )}
                          {item.notes && (
                            <small className="text-muted d-block">
                              {item.notes}
                            </small>
                          )}
                        </td>
                        <td>
                          <Badge
                            bg={
                              item.category === "liability"
                                ? "danger"
                                : item.category === "gold"
                                  ? "warning"
                                  : item.status === "new"
                                    ? "success"
                                    : "secondary"
                            }
                            text={item.category === "gold" ? "dark" : undefined}
                            className="small"
                          >
                            {item.categoryLabel}
                          </Badge>
                        </td>
                        <td>
                          {item.newUnits !== undefined ? (
                            <div>
                              {item.oldUnits != null && (
                                <span className="text-muted text-decoration-line-through small me-1">
                                  {item.oldUnits.toFixed(2)}
                                </span>
                              )}
                              <span className="fw-semibold text-primary">
                                {item.newUnits.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="text-end text-muted">
                          {item.status === "new"
                            ? "-"
                            : toLocalCurrency(item.oldValue)}
                        </td>
                        <td className="text-end fw-semibold">
                          {toLocalCurrency(item.newValue)}
                        </td>
                        <td
                          className={`text-end fw-semibold ${
                            item.category === "liability"
                              ? item.delta <= 0
                                ? "text-success"
                                : "text-danger"
                              : item.delta >= 0
                                ? "text-success"
                                : "text-danger"
                          }`}
                        >
                          {item.delta >= 0 ? "+" : ""}
                          {toLocalCurrency(item.delta)}
                        </td>
                      </tr>
                    ))}

                    {filteredActionableItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-muted">
                          No items match the selected category filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>

            {/* App-Managed Assets (Protected) Accordion */}
            <Accordion className="border rounded mb-3">
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  <BsShieldCheck className="me-2 text-success" />
                  <span>
                    App-Managed Assets (<strong>{appOnlyItems.length}</strong>{" "}
                    Preserved & Untouched)
                  </span>
                </Accordion.Header>
                <Accordion.Body className="p-0">
                  <div className="p-3 bg-body-secondary small border-bottom">
                    🔒 These items exist in your app but are not tracked in
                    INDmoney (e.g. SSY accounts, unlinked bank accounts). They
                    are **100% protected** and will not be altered.
                  </div>
                  <Table size="sm" hover className="mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th>Holder</th>
                        <th>Asset Name</th>
                        <th>Category</th>
                        <th>Details</th>
                        <th className="text-end">Current Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appOnlyItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.holderName}</td>
                          <td className="fw-semibold">{item.assetName}</td>
                          <td>
                            <Badge bg="secondary">{item.categoryLabel}</Badge>
                          </td>
                          <td className="text-muted small">
                            {item.notes || "-"}
                          </td>
                          <td className="text-end">
                            {toLocalCurrency(item.oldValue)}
                          </td>
                          <td>
                            <Badge
                              bg="success-subtle"
                              className="text-success border border-success-subtle"
                            >
                              🔒 Untouched
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top justify-content-between">
        {diffResult && !syncSuccess ? (
          <>
            <Button variant="outline-secondary" onClick={handleReset}>
              Upload Different File
            </Button>
            <div className="d-flex gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={
                  isApplying ||
                  !diffResult.items.some(
                    (i) =>
                      i.selected &&
                      (i.status === "update" || i.status === "new"),
                  )
                }
                onClick={handleApply}
              >
                {isApplying ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Applying Updates...
                  </>
                ) : (
                  `Apply Selected Updates (${
                    diffResult.items.filter(
                      (i) =>
                        i.selected &&
                        (i.status === "update" || i.status === "new"),
                    ).length
                  })`
                )}
              </Button>
            </div>
          </>
        ) : (
          <Button variant="secondary" className="ms-auto" onClick={handleClose}>
            Close
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};
