/**
 * Breakdown Chart Component
 *
 * 분해 분석을 위한 바 차트 및 테이블
 * Command Center 스타일
 */

import type { BreakdownChartData } from "@/lib/kpiCalculations";
import { cn } from "@/lib/utils";
import {
  formatInteger,
  formatPercent,
  formatCurrencyUSD,
} from "@/lib/formatters";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BreakdownChartProps {
  data: BreakdownChartData;
  height?: number;
}

type ValueKind = "count" | "usd" | "percent";

function inferValueKind(data: BreakdownChartData): ValueKind {
  const id = (data.id || "").toLowerCase();
  const title = data.title || "";

  if (
    id.includes("cost") ||
    title.includes("비용") ||
    title.toLowerCase().includes("cost")
  )
    return "usd";

  if (
    id.includes("rate") ||
    id.includes("percent") ||
    id.includes("completion") ||
    title.includes("율") ||
    title.includes("%")
  )
    return "percent";

  return "count";
}

function formatValueByKind(value: number, kind: ValueKind): string {
  if (kind === "usd") return formatCurrencyUSD(value);
  if (kind === "percent") return formatPercent(value, "pct100", 1);
  return formatInteger(value);
}

// 차트 색상 팔레트
const COLORS = [
  "#58A6FF",
  "#3FB950",
  "#D29922",
  "#A371F7",
  "#F85149",
  "#79C0FF",
  "#7EE787",
  "#E3B341",
  "#BC8CFF",
  "#FF7B72",
];

// 커스텀 툴팁
function CustomTooltip({
  active,
  payload,
  kind,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      value: number;
      percentage?: number;
      completed?: number;
      total?: number;
    };
  }>;
  kind: ValueKind;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const d = payload[0].payload;

  const hasCounts =
    Number.isFinite(d.completed) && Number.isFinite(d.total) && d.total !== 0;

  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-lg max-w-xs">
      <p className="text-xs text-muted-foreground mb-1 truncate">{d.name}</p>
      {hasCounts && (
        <p className="text-xs text-muted-foreground">
          {formatInteger(d.completed ?? 0)}/{formatInteger(d.total ?? 0)}
        </p>
      )}
      <p className="text-sm font-medium text-foreground">
        {formatValueByKind(Number(d.value), kind)}
      </p>
      {d.percentage !== undefined && (
        <p className="text-xs text-muted-foreground">
          {formatPercent(d.percentage, "pct100", 1)}
        </p>
      )}
    </div>
  );
}

// 바 차트 컴포넌트
function BarChartView({
  data,
  height,
  kind,
}: {
  data: BreakdownChartData;
  height: number;
  kind: ValueKind;
}) {
  const isCostBreakdown = data.id.startsWith("cost_by_");
  const isCompletionByDomain = data.id === "completion_by_domain";
  const labelLimit = isCostBreakdown ? 40 : 20;
  const maxLabelLength = data.data.reduce(
    (maxLength, item) => Math.max(maxLength, item.name.length),
    0,
  );
  const yAxisWidth = isCompletionByDomain
    ? 60
    : isCostBreakdown
      ? Math.min(200, Math.max(120, maxLabelLength * 6))
      : 100;

  const chartData = data.data.map((d, i) => ({
    ...d,
    displayName:
      d.name.length > labelLimit ? d.name.slice(0, labelLimit) + "..." : d.name,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#30363D"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fill: "#8B949E", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "#30363D" }}
          tickFormatter={(value: number) => formatValueByKind(value, kind)}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          tick={{ fill: "#8B949E", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={yAxisWidth}
        />
        <Tooltip content={<CustomTooltip kind={kind} />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 테이블 뷰 컴포넌트
function TableView({ data }: { data: BreakdownChartData }) {
  const kind = inferValueKind(data);
  const hasPercentage = data.data.some(
    (d) => d.percentage !== undefined && d.percentage !== null,
  );

  const valueHeader =
    kind === "usd" ? "비용" : kind === "percent" ? "비율" : "건";

  return (
    <div className="overflow-auto max-h-[280px]">
      <table className="w-full text-sm">
        <caption className="sr-only">
          {data.title} 상세 데이터 테이블. {data.description || ""}
        </caption>
        <thead className="sticky top-0 bg-muted/40 backdrop-blur-sm">
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-muted-foreground font-medium">
              #
            </th>
            <th className="text-left py-2 px-2 text-muted-foreground font-medium">
              항목
            </th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">
              {valueHeader}
            </th>
            {hasPercentage && (
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                비율
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.data.map((row, index) => (
            <tr
              key={index}
              className={cn(
                "border-b border-border/50 hover:bg-muted/30 transition-colors",
                index === 0 && "bg-destructive/10",
              )}
            >
              <td className="py-2 px-2 text-muted-foreground">{index + 1}</td>
              <td className="py-2 px-2 text-foreground">
                <span className="block truncate max-w-[200px]" title={row.name}>
                  {row.name}
                </span>
              </td>
              <td className="py-2 px-2 text-right text-foreground font-mono">
                {formatValueByKind(Number(row.value), kind)}
              </td>
              {hasPercentage && (
                <td className="py-2 px-2 text-right text-muted-foreground">
                  {row.percentage == null
                    ? "-"
                    : formatPercent(row.percentage, "pct100", 1)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BreakdownChart({ data, height = 280 }: BreakdownChartProps) {
  const kind = inferValueKind(data);
  const total = data.data.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const avg = data.data.length > 0 ? total / data.data.length : 0;
  const hasData = data.data.length > 0;

  const summaryText = hasData
    ? kind === "usd"
      ? `총 ${formatCurrencyUSD(total)}`
      : kind === "percent"
        ? `평균 ${formatPercent(avg, "pct100", 1)}`
        : `총 ${formatInteger(total)}건`
    : "-";

  if (data.data.length === 0) {
    return (
      <div className="panel h-full" aria-describedby={`desc-${data.id}`}>
        <div className="sr-only" id={`desc-${data.id}`}>
          {data.title} 차트입니다. {summaryText}. {data.description || ""}
        </div>
        <div className="panel-header">
          <h3 className="text-sm font-medium text-foreground">{data.title}</h3>
          <span className="text-xs text-muted-foreground">{summaryText}</span>
        </div>
        <div
          className="panel-body flex flex-col items-center justify-center space-y-3"
          style={{ height }}
        >
          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line
                x1="12"
                x2="12"
                y1="20"
                y2="10"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <line
                x1="18"
                x2="18"
                y1="20"
                y2="4"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <line
                x1="6"
                x2="6"
                y1="20"
                y2="16"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            데이터가 없습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full" aria-describedby={`desc-${data.id}`}>
      <div className="sr-only" id={`desc-${data.id}`}>
        {data.title} 차트입니다. {summaryText}. {data.description || ""}
      </div>
      <div className="panel-header">
        <h3 className="text-sm font-medium text-foreground">{data.title}</h3>
        <span className="text-xs text-muted-foreground">{summaryText}</span>
      </div>
      <div className="panel-body">
        {data.type === "table" ? (
          <TableView data={data} />
        ) : (
          <BarChartView data={data} height={height} kind={kind} />
        )}
      </div>
    </div>
  );
}

export default BreakdownChart;
