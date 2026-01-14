/**
 * Trend Chart Component
 *
 * 일별 추이를 보여주는 라인 차트
 * Recharts 기반, Command Center 스타일
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { TrendChartData } from "@/lib/kpiCalculations";
import {
  formatCurrencyUSD,
  formatInteger,
  formatPercent,
} from "@/lib/formatters";

interface TrendChartProps {
  data: TrendChartData;
  height?: number;
  showArea?: boolean;
}

type ValueKind = "count" | "usd" | "percent";

function inferValueKind(data: TrendChartData): ValueKind {
  const label = data.yAxisLabel.toLowerCase();
  if (label.includes("%") || label.includes("율")) return "percent";
  if (label.includes("usd") || label.includes("비용") || label.includes("$"))
    return "usd";
  return "count";
}

function formatValue(
  value: number,
  kind: ValueKind,
  unitLabel: string,
  includeUnit: boolean,
): string {
  if (kind === "usd") return formatCurrencyUSD(value);
  if (kind === "percent") return formatPercent(value, "pct100", 1);
  const count = formatInteger(value);
  if (!includeUnit) return count;
  return unitLabel.includes("사용자") ? `${count}명` : count;
}

// 커스텀 툴팁
function CustomTooltip({
  active,
  payload,
  label,
  kind,
  unitLabel,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  kind: ValueKind;
  unitLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-md px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground">
        {typeof payload[0].value === "number"
          ? formatValue(payload[0].value, kind, unitLabel, true)
          : payload[0].value}
      </p>
    </div>
  );
}

export function TrendChart({
  data,
  height = 200,
  showArea = true,
}: TrendChartProps) {
  const chartData = data.data.map((d) => ({
    ...d,
    displayDate:
      typeof d.date === "string"
        ? d.date.length >= 10
          ? d.date.slice(5)
          : d.date
        : "-",
  }));
  const kind = inferValueKind(data);

  // 데이터가 없을 때
  if (chartData.length === 0) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <h3 className="text-sm font-medium text-foreground">{data.title}</h3>
        </div>
        <div
          className="panel-body flex items-center justify-center"
          style={{ height }}
        >
          <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <h3 className="text-sm font-medium text-foreground">{data.title}</h3>
      </div>
      <div className="panel-body" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {showArea ? (
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id={`gradient-${data.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={data.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={data.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#30363D"
                vertical={false}
              />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: "#8B949E", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#30363D" }}
              />
              <YAxis
                tick={{ fill: "#8B949E", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(value) =>
                  formatValue(value, kind, data.yAxisLabel, false)
                }
              />
              <Tooltip
                content={
                  <CustomTooltip kind={kind} unitLabel={data.yAxisLabel} />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={data.color}
                strokeWidth={2}
                fill={`url(#gradient-${data.id})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: data.color,
                  stroke: "#0D1117",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          ) : (
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#30363D"
                vertical={false}
              />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: "#8B949E", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#30363D" }}
              />
              <YAxis
                tick={{ fill: "#8B949E", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(value) =>
                  formatValue(value, kind, data.yAxisLabel, false)
                }
              />
              <Tooltip
                content={
                  <CustomTooltip kind={kind} unitLabel={data.yAxisLabel} />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={data.color}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: data.color,
                  stroke: "#0D1117",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {data.description ? (
        <div className="px-4 pb-4 text-xs text-muted-foreground whitespace-pre-line">
          {data.description}
        </div>
      ) : null}
    </div>
  );
}

export default TrendChart;
