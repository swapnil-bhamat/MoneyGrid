import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Sector,
} from "recharts";

type DataItem = {
  [key: string]: string | number;
};

interface ChartDataItem {
  name: string;
  value: number;
}

interface Props {
  data: DataItem[];
  colors: string[];
  height?: number;
  tooltipFormatter: (value: number) => string;
  valueKey: string;
  nameKey: string;
}

type SectorProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: ChartDataItem;
  percent: number;
  value: number;
};

interface RenderActiveShapeProps extends SectorProps {
  tooltipFormatter: (value: number) => string;
}

const renderActiveShape = (props: unknown) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
    tooltipFormatter,
  } = props as RenderActiveShapeProps;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <text x={cx} y={cy} textAnchor="middle" fill="#333">
        <tspan x={cx} dy="-0.5em" fontSize="14">
          {payload.name}
        </tspan>
        <tspan x={cx} dy="1.5em" fontSize="14" fontWeight="bold">
          {tooltipFormatter(value)}
        </tspan>
        <tspan x={cx} dy="1.5em" fontSize="12">
          ({(percent * 100).toFixed(0)}%)
        </tspan>
      </text>
    </g>
  );
};

export const CustomPieChart: React.FC<Props> = ({
  data,
  colors,
  height = 250,
  valueKey,
  nameKey,
}) => {
  const processedData = data.map((item) => ({
    name: String(item[nameKey]),
    value: Number(item[valueKey]),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={processedData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          dataKey="value"
          activeShape={renderActiveShape}
        >
          {processedData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Legend
          formatter={(value) => {
            const item = processedData.find((d) => d.name === value);
            return item?.value ? value : "";
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
