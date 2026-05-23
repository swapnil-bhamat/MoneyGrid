import { Row, Col } from "react-bootstrap";
import GoalGauge from "./GoalGauge";

interface GoalProgress {
  id: number;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
  gap: number;
}

interface GoalProgressChartProps {
  data: GoalProgress[];
}

export default function GoalProgressChart({ data }: GoalProgressChartProps) {
  return (
    <Row xs={1} sm={2} md={3} lg={4} className="g-4">
      {data.map((item) => (
        <Col key={item.id}>
          <GoalGauge
            name={item.name}
            targetAmount={item.targetAmount}
            allocatedAmount={item.allocatedAmount}
          />
        </Col>
      ))}
    </Row>
  );
}
