import { useState, useEffect } from "react";
import { Row, Col, Form, InputGroup, Card } from "react-bootstrap";
import { getREITData, REIT } from "@/data/reitData";
import REITCard from "@/components/accounts/REITCard";
import { toLocalCurrency, getActiveCurrency } from "@/utils/numberUtils";
import AmountInput from "@/components/common/AmountInput";
import { t } from "@/utils/localization";

export default function REITsPage() {
  const [reits, setReits] = useState<REIT[]>([]);
  const [totalInvestment, setTotalInvestment] = useState<number>(6500000);
  const [investmentMode] = useState<"equal" | "custom">("equal");

  useEffect(() => {
    setReits(getREITData());
  }, []);

  const handleUpdateREIT = (id: string, field: keyof REIT, value: any) => {
    setReits((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleTotalInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalInvestment(parseFloat(e.target.value) || 0);
  };

  // Calculate totals
  const totalMonthlyIncome = reits.reduce((sum, reit) => {
    const amount = investmentMode === "equal" ? totalInvestment / reits.length : 0; // TODO: Custom mode
    return sum + (amount * (reit.calculatedYield / 100)) / 12;
  }, 0);

  const avgYield =
    reits.reduce((sum, r) => sum + r.calculatedYield, 0) / (reits.length || 1);

  const activeCurrency = getActiveCurrency();

  return (
    <div className="h-100 d-flex flex-column">
      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
            <Row className="align-items-end g-3">
                <Col md={4}>
                    <Form.Group>
                        <Form.Label className="fw-bold">{t.assets.sipAmount || "Total Investment Amount"}</Form.Label>
                        <InputGroup>
                            <InputGroup.Text>{activeCurrency.symbol}</InputGroup.Text>
                            <AmountInput 
                                value={totalInvestment} 
                                onChange={handleTotalInvestmentChange}
                            />
                        </InputGroup>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <div className="text-muted small mb-1">{t.income.monthlyAmount || "Total Monthly Income"}</div>
                    <div className="fs-3 fw-bold text-success">
                        {toLocalCurrency(totalMonthlyIncome)}
                    </div>
                </Col>
                <Col md={4}>
                     <div className="text-muted small mb-1">Average Yield</div>
                     <div className="fs-3 fw-bold text-primary">
                        {avgYield.toFixed(2)}%
                     </div>
                </Col>
            </Row>
        </Card.Body>
      </Card>

      <Row xs={1} md={2} lg={4} className="g-4">
        {reits.map((reit) => (
          <Col key={reit.id}>
            <REITCard
              reit={reit}
              investmentAmount={totalInvestment / reits.length}
              onUpdate={handleUpdateREIT}
            />
          </Col>
        ))}
      </Row>
      
      <div className="mt-4 text-muted small">
        * Yields are calculated based on the last 4 dividend payouts. Prices and WALE are estimates and can be edited.
      </div>
    </div>
  );
}
