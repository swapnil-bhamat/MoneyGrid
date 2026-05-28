
import { useSharedDashboardData } from "@/contexts/DashboardDataContext";
import { Container, Row, Col, Card } from "react-bootstrap";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import GoalProgressChart from "@/components/budgets/GoalProgressChart";
import Gauge from "@/components/common/Gauge";
import CashFlowDiagram from "@/components/analytics/CashFlowDiagram";
import { toLocalCurrency } from "@/utils/numberUtils";
import { useMobile } from "@/hooks/useMobile";
import { t } from "@/utils/localization";


import DailyTipCard from "@/components/widgets/DailyTipCard";
import GoldRateCard from "@/components/widgets/GoldRateCard";


export default function Dashboard() {
  const {
    cardData,
    withPercentage,
    savingsCashFlow,
    assetClassAllocation,
    assetAllocationByGoal,
    assetClassColors,
    assetGoalColors,
    savingsColors,
    assetAllocationByBucket,
    goalProgress,
    projectedAssetGrowth,
    incomeAllocation,
  } = useSharedDashboardData();

  const isMobile = useMobile();

  const renderCustomizedLabel = (props: any) => {
    const {
      cx = 0,
      cy = 0,
      midAngle = 0,
      innerRadius = 0,
      outerRadius = 0,
      percent = 0,
    } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = Number(cx) + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
    const y = Number(cy) + radius * Math.sin(-(midAngle ?? 0) * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > Number(cx) ? "start" : "end"}
        dominantBaseline="central"
      >
        {`${((percent ?? 1) * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Container fluid className="flex-grow-1 overflow-auto">
      <div>
        <Row className="mb-4 align-items-stretch">
          <Col xs={12} md={8} className="mb-3 mb-md-0">
            <DailyTipCard />
          </Col>
          <Col xs={12} md={4}>
            <GoldRateCard />
          </Col>
        </Row>
        {/* Cards */}
        <Row className="mb-4">
          {cardData.map((card) => (
            <Col key={card.title} md={4} className="mb-3 mb-md-0">
              <Card
                bg={card.bg}
                text={card.text}
                className="h-100 shadow"
                onClick={() => {
                  if (card.url) window.location.href = card.url;
                }}
                style={{ cursor: card.url ? "pointer" : "default" }}
              >
                <Card.Header
                  as="h5"
                  className={`bg-${card.bg} text-${card.text}`}
                >
                  {card.title}
                </Card.Header>
                <Card.Body>
                  <Card.Text className="display-6">
                    {toLocalCurrency(card.value)}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        {/* 50:30:20 Rule Gauges */}
        <Row>
          <Col md={12}>
            <Card className="mb-4 shadow">
              <Card.Header as="h6">
                {t.dashboard.monthlyIncomeVsExpenses}
              </Card.Header>
              <Card.Body>
                <Row xs={1} md={3} className="g-4">
                  {withPercentage.map((item) => (
                    <Col key={item!.id}>
                      <Gauge {...item!} />
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        {/* 50:30:20 Rule Gauges End */}
        <Row>
          <Col md={12}>
            <CashFlowDiagram />
          </Col>
        </Row>
        {/* Goal Progress Chart */}
        <Row>
          <Col md={12}>
            {goalProgress.length > 0 && (
              <Card className="mb-4 shadow">
                <Card.Header as="h6">{t.dashboard.financialGoalsProgress}</Card.Header>
                <Card.Body>
                  <GoalProgressChart data={goalProgress} />
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
        {/* Pie Charts */}
        <Row>
          <Col md={4}>
            {incomeAllocation && incomeAllocation.length > 0 && (
              <Card className="mb-4 shadow">
                <Card.Header as="h6">{t.dashboard.incomeBreakdown}</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeAllocation}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {incomeAllocation.map((_, index) => (
                          <Cell
                            key={`cell-income-${index}`}
                            fill={assetGoalColors[index % assetGoalColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          toLocalCurrency(value)
                        }
                      />
                      {!isMobile && <Legend />}
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
          <Col md={4}>
            {savingsCashFlow.length > 0 && (
              <Card className="mb-4 shadow">
                <Card.Header as="h6">{t.dashboard.monthlyCashFlow}</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={savingsCashFlow}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {savingsCashFlow.map((_, index) => (
                          <Cell
                            key={`cell-savings-${index}`}
                            fill={savingsColors[index % savingsColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          toLocalCurrency(value)
                        }
                      />
                      {!isMobile && <Legend />}
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
          <Col md={4}>
            {assetClassAllocation.length > 0 && (
              <Card className="mb-4 shadow">
                <Card.Header as="h6">{t.dashboard.assetAllocationClass}</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetClassAllocation}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {assetClassAllocation.map((entry, index) => (
                          <Cell
                            key={`cell-ac-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          toLocalCurrency(value)
                        }
                      />
                      {!isMobile && <Legend />}
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
          <Col md={4}>
            {projectedAssetGrowth.length > 0 && (
              <Card className="mb-4 shadow">
                <Card.Header as="h6">
                  {t.dashboard.projectedGrowth}
                </Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectedAssetGrowth}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {projectedAssetGrowth.map((entry, index) => (
                          <Cell
                            key={`cell-projected-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined, name) => {
                          const item = projectedAssetGrowth.find(
                            (i) => i.label === name
                          );
                          if (
                            item &&
                            value !== undefined &&
                            item.currentValue > 0
                          ) {
                            const growth = (
                              ((value - item.currentValue) /
                                item.currentValue) *
                              100
                            ).toFixed(1);
                            return `${toLocalCurrency(value)} (+${growth}%)`;
                          }
                          return toLocalCurrency(value);
                        }}
                      />
                      {!isMobile && <Legend />}
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
        <Row>
          <Col md={4}>
            {assetAllocationByBucket.length > 0 && (
              <Card className="mb-4 shadow">
                <Card.Header as="h6">{t.dashboard.assetAllocationBucket}</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocationByBucket}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {assetAllocationByBucket.map((_, index) => (
                          <Cell
                            key={`cell-savings-${index}`}
                            fill={
                              assetClassColors[index % assetClassColors.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          toLocalCurrency(value)
                        }
                      />
                      {!isMobile && <Legend />}
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
          <Col md={4}>
            {assetAllocationByGoal.length > 0 && (
              <Card className="mb-4 shadow">
                <Card.Header as="h6">{t.dashboard.assetAllocationGoal}</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocationByGoal}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {assetAllocationByGoal.map((_, index) => (
                          <Cell
                            key={`cell-goal-${index}`}
                            fill={
                              assetGoalColors[index % assetGoalColors.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          toLocalCurrency(value)
                        }
                      />
                      {!isMobile && <Legend />}
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </div>
    </Container>
  );
}
