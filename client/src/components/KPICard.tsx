/**
 * KPI Card Component
 *
 * Command Center 스타일의 KPI 카드
 * 상태 인디케이터, 미니 스파크라인, 트렌드 표시 포함
 */

import { cn } from "@/lib/utils";
import type { KPIData, KPIStatus } from "@/lib/kpiCalculations";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KPICardProps {
  data: KPIData;
  compact?: boolean;
  onClick?: () => void;
}

// 상태별 색상 매핑
const statusColors: Record<
  KPIStatus,
  { bg: string; border: string; dot: string; glow: string }
> = {
  success: {
    bg: "bg-[#3FB950]/10",
    border: "border-[#3FB950]/30",
    dot: "bg-[#3FB950]",
    glow: "shadow-[0_0_8px_rgba(63,185,80,0.5)]",
  },
  warning: {
    bg: "bg-[#D29922]/10",
    border: "border-[#D29922]/30",
    dot: "bg-[#D29922]",
    glow: "shadow-[0_0_8px_rgba(210,153,34,0.5)]",
  },
  danger: {
    bg: "bg-[#F85149]/10",
    border: "border-[#F85149]/30",
    dot: "bg-[#F85149]",
    glow: "shadow-[0_0_8px_rgba(248,81,73,0.5)]",
  },
};

// 미니 스파크라인 SVG
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const width = 60;
  const height = 20;
  const padding = 2;

  const points = data
    .map((value, index) => {
      const x =
        padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
      const y =
        height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="opacity-70">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// 트렌드 아이콘
function TrendIndicator({
  direction,
  value,
}: {
  direction: "up" | "down" | "flat";
  value: number;
}) {
  const Icon =
    direction === "up"
      ? TrendingUp
      : direction === "down"
        ? TrendingDown
        : Minus;
  const colorClass =
    direction === "up"
      ? "text-[#3FB950]"
      : direction === "down"
        ? "text-[#F85149]"
        : "text-muted-foreground";

  if (Math.abs(value) < 0.1) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <span className={cn("flex items-center gap-0.5 text-xs", colorClass)}>
      <Icon className="w-3 h-3" />
      <span>{Math.abs(value).toFixed(1)}%</span>
    </span>
  );
}

export function KPICard({ data, compact = false, onClick }: KPICardProps) {
  const colors = statusColors[data.status];
  const sparklineColor =
    data.status === "success"
      ? "#3FB950"
      : data.status === "warning"
        ? "#D29922"
        : "#F85149";
  const tooltipTextMap: Record<string, string> = {
    "total-users": "Total unique users (user_profiles)",
    dau: "Daily active users (user_event_log)",
    wau: "Weekly active users (last 7 days, user_event_log)",
    mau: "Monthly active users (last 30 days, user_event_log)",
    "routine-calls": "Daily routine generation calls (llm_usage)",
    "weekly-plan-calls": "Weekly plan generation calls (llm_usage)",
    "routine-completion-rate": "Routine completion rate (completed/total)",
    "routine-completed-per-day": "Average routines completed per day",
    "job-failure-rate": "Job failure rate (failed/total)",
    "llm-error-rate": "LLM error rate (errors/total)",
    "llm-cost": "Total LLM cost",
    "avg-events-per-user": "Average events per user",
  };

  const tooltipText = tooltipTextMap[data.id] ?? data.description;

  if (compact) {
    // 컴팩트 모드 (사이드바용)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className={cn(
              "kpi-card cursor-pointer transition-all duration-200",
              "hover:scale-[1.02] hover:border-primary/50",
              colors.bg,
              colors.border,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              {/* 상태 점 + 제목 */}
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "status-dot flex-shrink-0",
                    colors.dot,
                    colors.glow,
                  )}
                />
                <span className="text-xs text-muted-foreground truncate">
                  {data.title}
                </span>
              </div>
              {/* 트렌드 */}
              <TrendIndicator
                direction={data.trendDirection}
                value={data.trend}
              />
            </div>

            {/* 값 */}
            <div className="mt-2 flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold number-display text-foreground">
                  {data.formattedValue}
                </span>
                <span className="text-xs text-muted-foreground">
                  {data.unit}
                </span>
              </div>
              <MiniSparkline data={data.sparklineData} color={sparklineColor} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-none whitespace-nowrap">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // 기본 모드
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={onClick}
          className={cn(
            "kpi-card cursor-pointer transition-all duration-200",
            "hover:scale-[1.02] hover:border-primary/50 shadow-sm hover:shadow-md",
            colors.bg,
            colors.border,
          )}
        >
          <div className="flex items-start justify-between">
            {/* 상태 점 + 제목 */}
            <div className="flex items-center gap-2">
              <div className={cn("status-dot", colors.dot, colors.glow)} />
              <span className="text-sm text-muted-foreground">
                {data.title}
              </span>
            </div>
            {/* 트렌드 */}
            <TrendIndicator
              direction={data.trendDirection}
              value={data.trend}
            />
          </div>

          {/* 값 */}
          <div className="mt-3 flex items-end justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold number-display text-foreground">
                {data.formattedValue}
              </span>
              <span className="text-sm text-muted-foreground">{data.unit}</span>
            </div>
            <MiniSparkline data={data.sparklineData} color={sparklineColor} />
          </div>

          {/* 설명 */}
          <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
            {data.description}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-none whitespace-nowrap">
        <p className="text-xs">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default KPICard;
