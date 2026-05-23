import { Card } from "react-bootstrap";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toLocalCurrency } from "@/utils/numberUtils";

interface GaugeProps {
  label: string;
  percentage: number;
  rule: string;
  isValid: boolean;
  value: number;
}

const Gauge = ({ label, percentage, rule, isValid, value }: GaugeProps) => {
  const data = [{ value: percentage }, { value: 100 - percentage }];
  return (
    <Card className="text-center p-3 shadow-sm">
      <Card.Body>
        <Card.Title>{label}</Card.Title>
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={0}
                dataKey="value"
              >
                <Cell fill={isValid ? "#28a745" : "#dc3545"} />
                <Cell fill="#e9ecef" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <h5 className={isValid ? "text-success" : "text-danger"}>
          {percentage.toFixed(1)}% | {toLocalCurrency(value)}
        </h5>
        <small className="text-body-secondary">Rule: {rule}</small>
      </Card.Body>
    </Card>
  );
};

export default Gauge;
