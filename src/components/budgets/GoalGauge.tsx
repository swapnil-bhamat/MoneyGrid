import { Card } from "react-bootstrap";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toLocalCurrency } from "@/utils/numberUtils";

interface GoalGaugeProps {
  name: string;
  targetAmount: number;
  allocatedAmount: number;
}

const GoalGauge = ({ name, targetAmount, allocatedAmount }: GoalGaugeProps) => {
  const percentage = Math.min(100, (allocatedAmount / targetAmount) * 100);
  const data = [{ value: percentage }, { value: Math.max(0, 100 - percentage) }];
  const isValid = percentage >= 100;

  return (
    <Card className="text-center p-2 shadow-sm h-100">
      <Card.Body className="d-flex flex-column">
        <Card.Title className="text-truncate" title={name}>{name}</Card.Title>
        <div style={{ width: "100%", height: 140 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                startAngle={180}
                endAngle={0}
                innerRadius={50}
                outerRadius={70}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={isValid ? "#28a745" : "#0dcaf0"} />
                <Cell fill="#e9ecef" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-auto">
          <h5 className={isValid ? "text-success" : "text-info"}>
            {percentage.toFixed(1)}%
          </h5>
          <div className="small text-muted">
             Allocated: {toLocalCurrency(allocatedAmount)}
          </div>
          <div className="small text-muted">
             Target: {toLocalCurrency(targetAmount)}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default GoalGauge;
