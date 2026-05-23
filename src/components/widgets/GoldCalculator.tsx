import { useState, useEffect } from "react";
import { Card, Form, Row, Col, InputGroup } from "react-bootstrap";
import { fetchGoldData, GoldData } from "@/services/marketData";
import { toLocalCurrency } from "@/utils/numberUtils";

const UNITS = [
  { value: "g", label: "Grams (g)", multiplier: 1 },
  { value: "tola", label: "Tola (11.66g)", multiplier: 11.66 },
  { value: "oz", label: "Ounce (31.1g)", multiplier: 31.1035 },
  { value: "kg", label: "Kilogram (kg)", multiplier: 1000 },
];

export default function GoldCalculator() {
  const [weight, setWeight] = useState<number>(100);
  const [unit, setUnit] = useState<string>("g");
  const [purity, setPurity] = useState<string>("24k");
  const [totalValue, setTotalValue] = useState<number>(0);
  const [rates, setRates] = useState<GoldData | null>(null);

  useEffect(() => {
    fetchGoldData().then((data) => {
      if (data) setRates(data);
    });
  }, []);

  useEffect(() => {
    if (!weight || !rates) {
      setTotalValue(0);
      return;
    }

    const unitMultiplier = UNITS.find((u) => u.value === unit)?.multiplier || 1;
    const weightInGrams = Number(weight) * unitMultiplier;
    
    let ratePerGram = 0;
    switch (purity) {
        case "24k": ratePerGram = rates.price_gram_24k; break;
        case "22k": ratePerGram = rates.price_gram_22k; break;
        case "21k": ratePerGram = rates.price_gram_21k; break;
        case "18k": ratePerGram = rates.price_gram_18k; break;
    }

    setTotalValue(weightInGrams * ratePerGram);
  }, [weight, unit, purity, rates]);

  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-body border-bottom-0 pt-3">
        <h5 className="mb-0">Gold Value Calculator</h5>
      </Card.Header>
      <Card.Body>
        <Form>
          <Row className="g-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label>Weight</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    placeholder="Enter weight"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                  />
                  <Form.Select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={{ maxWidth: "120px" }}
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </Form.Select>
                </InputGroup>
              </Form.Group>
            </Col>

            <Col md={12}>
                <Form.Group>
                    <Form.Label>Purity</Form.Label>
                    <Form.Select value={purity} onChange={(e) => setPurity(e.target.value)}>
                        <option value="24k">24K (99.9%)</option>
                        <option value="22k">22K (91.6%)</option>
                        <option value="21k">21K (87.5%)</option>
                        <option value="18k">18K (75.0%)</option>
                    </Form.Select>
                </Form.Group>
            </Col>

            <Col md={12}>
                <div className="p-3 bg-light-subtle rounded mt-2">
                    <div className="text-muted small mb-1">Estimated Value</div>
                    <div className="fs-3 fw-bold text-success">
                        {toLocalCurrency(totalValue)}
                    </div>
                </div>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}
