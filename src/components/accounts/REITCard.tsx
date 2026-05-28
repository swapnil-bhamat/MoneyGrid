import { useState, useEffect } from "react";
import { Card, Form, Row, Col, InputGroup } from "react-bootstrap";
import { REIT } from "@/data/reitData";
import { toLocalCurrency, getActiveCurrency } from "@/utils/numberUtils";

interface REITCardProps {
  reit: REIT;
  investmentAmount: number;
  onUpdate: (id: string, field: keyof REIT, value: any) => void;
}

export default function REITCard({ reit, investmentAmount, onUpdate }: REITCardProps) {
  const [localYield, setLocalYield] = useState(reit.calculatedYield);
  const [localPrice, setLocalPrice] = useState(reit.currentPrice);
  const [localWale, setLocalWale] = useState(reit.wale);
  const currency = getActiveCurrency();

  useEffect(() => {
    setLocalYield(reit.calculatedYield);
    setLocalPrice(reit.currentPrice);
    setLocalWale(reit.wale);
  }, [reit]);

  const handleYieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalYield(val);
    onUpdate(reit.id, "calculatedYield", val);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalPrice(val);
    onUpdate(reit.id, "currentPrice", val);
  };

  const handleWaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalWale(val);
    onUpdate(reit.id, "wale", val);
  };

  const monthlyIncome = (investmentAmount * (localYield / 100)) / 12;
  const units = investmentAmount / localPrice;

  return (
    <Card className="shadow-sm h-100 mb-3">
      <Card.Header className="border-bottom-0 pt-3">
        <h5 className="mb-0 text-primary">{reit.reit_name}</h5>
      </Card.Header>
      <Card.Body>
        <Row className="g-3">
          <Col xs={6}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Current Price</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text>{currency.symbol}</InputGroup.Text>
                <Form.Control
                  type="number"
                  value={localPrice}
                  onChange={handlePriceChange}
                />
              </InputGroup>
            </Form.Group>
          </Col>
          <Col xs={6}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Yield (%)</Form.Label>
              <InputGroup size="sm">
                <Form.Control
                  type="number"
                  step="0.01"
                  value={localYield.toFixed(2)}
                  onChange={handleYieldChange}
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">WALE (Years)</Form.Label>
              <Form.Control
                size="sm"
                type="text"
                value={localWale}
                onChange={handleWaleChange}
              />
            </Form.Group>
          </Col>
        </Row>

        <hr className="my-3" />

        <div className="d-flex justify-content-between align-items-center">
            <div>
                <div className="text-muted small">Est. Monthly Income</div>
                <div className="fs-5 fw-bold text-success">
                    {toLocalCurrency(monthlyIncome)}
                </div>
            </div>
            <div className="text-end">
                <div className="text-muted small">Units</div>
                <div className="fw-bold">{units.toFixed(0)}</div>
            </div>
        </div>
      </Card.Body>
    </Card>
  );
}
