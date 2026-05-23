import React from "react";
import { Card, Form } from "react-bootstrap";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toLocalCurrency } from "@/utils/numberUtils";

interface ChartData {
  year: number;
  assets: number;
  liabilities: number;
  netWorth: number;
  realNetWorth: number;
}

interface NetWorthChartProps {
  chartData: ChartData[];
  projectionYears: number;
  setProjectionYears: (years: number) => void;
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({
  chartData,
  projectionYears,
  setProjectionYears,
}) => {
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Body>
        <div style={{ height: window.innerWidth < 768 ? "350px" : "450px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#28a745" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#28a745" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc3545" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#dc3545" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0d6efd" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorRealNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fd7e14" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#fd7e14" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={window.innerWidth < 768 ? 0.2 : 0.3}
              />
              <XAxis
                dataKey="year"
                style={{ fontSize: window.innerWidth < 768 ? "12px" : "14px" }}
                tick={{ fill: "#666" }}
              />
              <YAxis
                tickFormatter={(value) => `₹${value / 100000}L`}
                style={{ fontSize: window.innerWidth < 768 ? "11px" : "13px" }}
                tick={{ fill: "#666" }}
                width={window.innerWidth < 768 ? 50 : 60}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div
                        className="bg-white p-3 border rounded shadow-sm"
                        style={{ minWidth: "200px" }}
                      >
                        <p className="fw-bold mb-2">Year {label}</p>
                        {payload.map((entry: any, index: number) => (
                          <p
                            key={index}
                            className="mb-1 small"
                            style={{ color: entry.color }}
                          >
                            <span className="fw-semibold">{entry.name}:</span>{" "}
                            <span
                              className={`fw-bold fs-6 ${
                                entry.name === "Liabilities"
                                  ? "text-danger"
                                  : "text-success"
                              }`}
                            >
                              {toLocalCurrency(entry.value)}
                            </span>
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {window.innerWidth >= 768 ? (
                <Legend wrapperStyle={{ fontSize: "13px" }} />
              ) : null}
              <Area
                type="monotone"
                dataKey="assets"
                stroke="#28a745"
                fillOpacity={1}
                fill="url(#colorAssets)"
                strokeWidth={2}
                name="Assets"
              />
              <Area
                type="monotone"
                dataKey="liabilities"
                stroke="#dc3545"
                fillOpacity={1}
                fill="url(#colorLiabilities)"
                strokeWidth={2}
                name="Liabilities"
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#0d6efd"
                fillOpacity={1}
                fill="url(#colorNetWorth)"
                strokeWidth={3}
                name="Net Worth (Nominal)"
              />
              <Area
                type="monotone"
                dataKey="realNetWorth"
                stroke="#fd7e14"
                fillOpacity={1}
                fill="url(#colorRealNetWorth)"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Real Net Worth"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mobile Legend */}
        {window.innerWidth < 768 && (
          <div className="d-flex flex-wrap justify-content-center gap-3 mt-3 small">
            <div>
              <span style={{ color: "#28a745", fontSize: "18px" }}>●</span>{" "}
              Assets
            </div>
            <div>
              <span style={{ color: "#dc3545", fontSize: "18px" }}>●</span>{" "}
              Liabilities
            </div>
            <div>
              <span style={{ color: "#0d6efd", fontSize: "18px" }}>●</span> Net
              Worth
            </div>
            <div>
              <span style={{ color: "#fd7e14", fontSize: "18px" }}>⋯</span> Real
              Net Worth
            </div>
          </div>
        )}

        <div className="mt-3">
          <Form.Label>Projection Years: {projectionYears}</Form.Label>
          <Form.Range
            min={1}
            max={30}
            value={projectionYears}
            onChange={(e) => setProjectionYears(Number(e.target.value))}
          />
        </div>
      </Card.Body>
    </Card>
  );
};
