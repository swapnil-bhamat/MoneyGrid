import { Container, Row, Col, Card } from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface RuleVisualization {
  title: string;
  description: string;
  visualization: "pie" | "bar" | "custom";
  data: Array<{
    name: string;
    value: number;
  }>;
  colors?: string[];
}

const RULES: RuleVisualization[] = [
  {
    title: "50/30/20 Rule",
    description:
      "A simple budgeting rule where 50% of income goes to needs, 30% to savings, and 20% to wants.",
    visualization: "pie",
    data: [
      { name: "Needs", value: 50 },
      { name: "Savings", value: 30 },
      { name: "Wants", value: 20 },
    ],
    colors: ["#2ecc71", "#3498db", "#e74c3c"],
  },
  {
    title: "Emergency Fund Rule",
    description:
      "Maintain 6 months of essential expenses as an emergency fund.",
    visualization: "bar",
    data: [
      { name: "Minimum (3 months)", value: 3 },
      { name: "Ideal (6 months)", value: 6 },
      { name: "Conservative (12 months)", value: 12 },
    ],
    colors: ["#f1c40f", "#2ecc71", "#3498db"],
  },
  {
    title: "Rule of 72",
    description:
      "Divide 72 by your expected rate of return to estimate how long it will take for your investment to double.",
    visualization: "bar",
    data: [
      { name: "2% Return", value: 36 },
      { name: "4% Return", value: 18 },
      { name: "6% Return", value: 12 },
      { name: "8% Return", value: 9 },
      { name: "10% Return", value: 7.2 },
    ],
    colors: ["#3498db"],
  },
  {
    title: "Asset Allocation Rule",
    description:
      "A common rule of thumb is to subtract your age from 100 to determine the percentage of your portfolio that should be in stocks.",
    visualization: "pie",
    data: [
      { name: "Stocks", value: 65 },
      { name: "Bonds", value: 35 },
    ],
    colors: ["#e74c3c", "#f1c40f"],
  },
  {
    title: "28/36 Debt Rule",
    description:
      "Monthly mortgage payment shouldn't exceed 28% of monthly gross income, and total debt payments shouldn't exceed 36%.",
    visualization: "bar",
    data: [
      { name: "Mortgage Limit", value: 28 },
      { name: "Other Debt", value: 8 },
      { name: "Remaining Income", value: 64 },
    ],
    colors: ["#e74c3c", "#f39c12", "#2ecc71"],
  },
  {
    title: "Investment Diversification",
    description:
      "A well-diversified portfolio should spread investments across different asset types to reduce risk.",
    visualization: "pie",
    data: [
      { name: "Large Cap", value: 40 },
      { name: "Mid Cap", value: 15 },
      { name: "Small Cap", value: 10 },
      { name: "International", value: 15 },
      { name: "Bonds", value: 15 },
      { name: "Cash", value: 5 },
    ],
    colors: ["#3498db", "#2ecc71", "#e74c3c", "#f1c40f", "#9b59b6", "#34495e"],
  },
  {
    title: "Multiple Income Rule",
    description:
      "Aim to have multiple streams of income for financial stability and growth.",
    visualization: "pie",
    data: [
      { name: "Primary Job", value: 60 },
      { name: "Side Business", value: 10 },
      { name: "Investments", value: 10 },
      { name: "Rental Income", value: 7 },
      { name: "Dividends", value: 5 },
      { name: "Royalties", value: 5 },
      { name: "Capital Gains", value: 3 },
    ],
    colors: [
      "#3498db",
      "#2ecc71",
      "#e74c3c",
      "#f1c40f",
      "#9b59b6",
      "#34495e",
      "#1abc9c",
    ],
  },
  {
    title: "10x Retirement Rule",
    description:
      "Aim to save 10 times your annual salary by retirement age. Shows recommended milestones by age.",
    visualization: "bar",
    data: [
      { name: "Age 30 (1x)", value: 1 },
      { name: "Age 40 (3x)", value: 3 },
      { name: "Age 50 (6x)", value: 6 },
      { name: "Age 60 (8x)", value: 8 },
      { name: "Age 67 (10x)", value: 10 },
    ],
    colors: ["#3498db"],
  },
];

function RuleChart({ rule }: { rule: RuleVisualization }) {
  if (rule.visualization === "pie") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={rule.data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            labelLine={false}
          >
            {rule.data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  rule.colors?.[index] ??
                  `#${Math.floor(Math.random() * 16777215).toString(16)}`
                }
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (rule.visualization === "bar") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={rule.data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill={rule.colors?.[0] ?? "#3498db"}>
            {rule.colors?.map((color, index) => (
              <Cell key={`cell-${index}`} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

export default function FinanceRules() {
  return (
    <Container fluid className="flex-grow-1 overflow-auto">
      <Row>
        {RULES.map((rule) => (
          <Col key={rule.title} lg={6} className="mb-4">
            <Card className="h-100 shadow">
              <Card.Header as="h5">{rule.title}</Card.Header>
              <Card.Body>
                <Card.Text>{rule.description}</Card.Text>
                <RuleChart rule={rule} />
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="mt-4">
        <Col>
          <Card className="shadow">
            <Card.Header as="h5">Additional Financial Wisdom</Card.Header>
            <Card.Body>
              <ul>
                <li>
                  <strong>Pay Yourself First Rule:</strong> Save a portion of
                  your income before spending on anything else.
                </li>
                <li>
                  <strong>1% Rule:</strong> Small improvements in savings and
                  investments compound over time.
                </li>
                <li>
                  <strong>10x Rule:</strong> Set goals 10 times bigger than what
                  you think you need to push beyond comfort zones.
                </li>
                <li>
                  <strong>Rule of 110:</strong> Another asset allocation rule
                  suggesting to subtract your age from 110 to determine stock
                  percentage.
                </li>
                <li>
                  <strong>4% Rule:</strong> A safe withdrawal rate in retirement
                  is generally considered to be 4% of your portfolio annually.
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
