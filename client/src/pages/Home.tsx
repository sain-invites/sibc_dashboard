/**
 * Service Overview Dashboard - Home Page
 *
 * CSV 대신 서버 API(/api/overview, /api/users) 기반 렌더링
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useHealthCheck, useOverviewAPI } from "@/hooks/useAPI";
import type {
  KPIData,
  TrendChartData,
  BreakdownChartData,
} from "@/lib/kpiCalculations";
import { KPICard } from "@/components/KPICard";
import { TrendChart } from "@/components/TrendChart";
import { BreakdownChart } from "@/components/BreakdownChart";
import { UserTable } from "@/components/UserTable";
import { DateFilter } from "@/components/DateFilter";
import {
  Activity,
  Database,
  AlertCircle,
  Users,
  DollarSign,
  CheckCircle,
  Book,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatDateTimeKST,
  formatDecimal,
  formatInteger,
} from "@/lib/formatters";
import { subDays, format } from "date-fns";

export default function Home() {
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const {
    data: overview,
    loading,
    error,
    refetch,
  } = useOverviewAPI(dateRange.start, dateRange.end);
  const health = useHealthCheck();

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  useEffect(() => {
    if (!loading && overview) setLastUpdated(new Date());
  }, [loading, overview]);

  const latestTrends = useMemo(() => {
    if (!overview) return null;

    type TrendMetric = { value: number; date: string };
    const getSortedByDate = (arr: TrendMetric[]) =>
      [...arr].sort((a, b) => a.date.localeCompare(b.date));
    const getLastValue = (arr: TrendMetric[]) => {
      if (arr.length === 0) return 0;
      const sorted = getSortedByDate(arr);
      return sorted[sorted.length - 1]?.value ?? 0;
    };
    const getPrevValue = (arr: TrendMetric[]) => {
      if (arr.length < 2) return 0;
      const sorted = getSortedByDate(arr);
      return sorted[sorted.length - 2]?.value ?? 0;
    };
    const calcTrend = (curr: number, prev: number) =>
      prev ? ((curr - prev) / prev) * 100 : 0;

    const newUsersValue = getLastValue(overview.trends.newUsers);
    const prevNewUsersValue = getPrevValue(overview.trends.newUsers);

    const returningUsersValue = getLastValue(overview.trends.returningUsers);
    const prevReturningUsersValue = getPrevValue(
      overview.trends.returningUsers,
    );

    const costPerCallValue = getLastValue(overview.trends.llmCostPerCall);
    const prevCostPerCallValue = getPrevValue(overview.trends.llmCostPerCall);

    const routineValue = getLastValue(overview.trends.routineCompleted);
    const prevRoutineValue = getPrevValue(overview.trends.routineCompleted);

    return [
      {
        title: "신규 사용자 (오늘)",
        valueText: formatInteger(newUsersValue),
        trend: calcTrend(newUsersValue, prevNewUsersValue),
        unit: "명",
        icon: Users,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
      },
      {
        title: "복귀 사용자 (오늘)",
        valueText: formatInteger(returningUsersValue),
        trend: calcTrend(returningUsersValue, prevReturningUsersValue),
        unit: "명",
        icon: Activity,
        color: "text-green-500",
        bg: "bg-green-500/10",
        border: "border-green-500/20",
      },
      {
        title: "LLM 비용/건 (오늘)",
        valueText: formatDecimal(costPerCallValue, 4),
        trend: calcTrend(costPerCallValue, prevCostPerCallValue),
        unit: "$",
        icon: DollarSign,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
      },
      {
        title: "루틴 완료 (오늘)",
        valueText: formatInteger(routineValue),
        trend: calcTrend(routineValue, prevRoutineValue),
        unit: "건",
        icon: CheckCircle,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
      },
    ];
  }, [overview]);

  const kpis: KPIData[] = useMemo(() => {
    if (!overview) return [];
    return overview.kpis.map((k) => ({
      ...k,
      sparklineData: [],
    }));
  }, [overview]);

  const trendCharts: TrendChartData[] = useMemo(() => {
    if (!overview) return [];
    return [
      {
        id: "new_users_trend",
        title: "신규 사용자 추이",
        data: overview.trends.newUsers.map((p) => ({
          date: p.date,
          value: p.value,
        })),
        yAxisLabel: "신규 사용자 수",
        color: "#58A6FF",
        description:
          "최초 활동일 기준 신규 사용자 수\nCOUNT(DISTINCT user_id) where first_event_date = day (user_event_log)",
      },
      {
        id: "returning_users_trend",
        title: "복귀 사용자 추이",
        data: overview.trends.returningUsers.map((p) => ({
          date: p.date,
          value: p.value,
        })),
        yAxisLabel: "복귀 사용자 수",
        color: "#3FB950",
        description: "당일 활성 사용자 중 신규 제외\nDAU - 신규 사용자",
      },
      {
        id: "dau_trend",
        title: "DAU 추이",
        data: overview.trends.dau.map((p) => ({
          date: p.date,
          value: p.value,
        })),
        yAxisLabel: "활성 사용자 수",
        color: "#A371F7",
        description:
          "하루 동안 활동한 고유 사용자 수\nCOUNT(DISTINCT user_id) (user_event_log)",
      },
      {
        id: "daily_events_trend",
        title: "일별 이벤트 수 추이",
        data: overview.trends.dailyEvents.map((p) => ({
          date: p.date,
          value: p.value,
        })),
        yAxisLabel: "이벤트 수",
        color: "#F85149",
        description: "하루 동안 발생한 이벤트 총합\nCOUNT(*) (user_event_log)",
      },
      {
        id: "avg_events_per_user_trend",
        title: "사용자당 평균 이벤트 수 추이",
        data: overview.trends.avgEventsPerUser.map((p) => ({
          date: p.date,
          value: p.value,
        })),
        yAxisLabel: "건/명",
        color: "#D29922",
        description: "활성 사용자 1인당 평균 이벤트 수\n일별 이벤트 수 / DAU",
      },
      {
        id: "routine_completed_trend",
        title: "루틴 완료 건수 추이",
        data: overview.trends.routineCompleted.map((p) => ({
          date: p.date,
          value: p.value,
        })),
        yAxisLabel: "완료 건수",
        color: "#FF7B72",
        description:
          "완료된 루틴 건수\nCOUNT(*) where completed_at IS NOT NULL (daily_routine_activities)",
      },
      {
        id: "routine_completion_rate_trend",
        title: "루틴 완료율 추이",
        data: overview.trends.routineCompletionRate.map((p) => ({
          date: p.date,
          value: p.value,
        })),
        yAxisLabel: "완료율 (%)",
        color: "#56D364",
        description:
          "완료율\ncompleted / total * 100 (daily_routine_activities)",
      },
      {
        id: "llm_error_rate_trend",
        title: "LLM 오류율 추이",
        data: overview.trends.llmErrorRate.map((p) => ({
          date: p.date,
          value: p.value,
        })),
        yAxisLabel: "오류율 (%)",
        color: "#FFA657",
        description: "LLM 오류율\nerror_calls / total_calls * 100 (llm_usage)",
      },
      {
        id: "llm_cost_per_call_trend",
        title: "LLM 비용/건 추이",
        data: overview.trends.llmCostPerCall.map((p) => ({
          date: p.date,
          value: p.value,
        })),
        yAxisLabel: "$/건",
        color: "#8B949E",
        description:
          "호출 1건당 평균 비용\nSUM(cost_usd) / COUNT(*) (llm_usage)",
      },
    ];
  }, [overview]);

  const breakdownCharts: BreakdownChartData[] = useMemo(() => {
    if (!overview) return [];
    return [
      {
        id: "cost_by_call_type",
        title: "call_type별 비용 Top",
        data: overview.breakdown.llmCostByType.map((d) => ({
          name: d.name,
          value: d.value,
          percentage: d.percentage,
        })),
        type: "bar",
      },
      {
        id: "cost_by_model",
        title: "model별 비용 Top",
        data: overview.breakdown.llmCostByModel.map((d) => ({
          name: d.name,
          value: d.value,
          percentage: d.percentage,
        })),
        type: "bar",
      },
      {
        id: "llm_error_top10",
        title: "LLM 에러 Top 10",
        data: overview.breakdown.llmErrorTop10.map((d) => ({
          name: d.name,
          value: d.value,
        })),
        type: "table",
      },
      {
        id: "completion_by_domain",
        title: "도메인별 수행율",
        data: overview.breakdown.completionByDomain.map((d) => ({
          name: d.name,
          value: d.value,
          completed: d.completed,
          total: d.total,
        })),
        type: "bar",
      },
      {
        id: "completion_by_priority",
        title: "우선순위별 수행율",
        data: overview.breakdown.completionByPriority.map((d) => ({
          name: d.name,
          value: d.value,
          completed: d.completed,
          total: d.total,
        })),
        type: "bar",
      },
      {
        id: "completion_by_period",
        title: "시간대별 수행율",
        data: overview.breakdown.completionByPeriod.map((d) => ({
          name: d.name,
          value: d.value,
          completed: d.completed,
          total: d.total,
        })),
        type: "bar",
      },
    ];
  }, [overview]);

  const handleDateChange = (start: Date, end: Date) =>
    setDateRange({ start, end });
  const handleRefresh = () => refetch();
  const generatedAtText = overview?.meta?.generatedAt
    ? formatDateTimeKST(overview.meta.generatedAt, true)
    : "-";
  const [generatedAtDate, generatedAtTime] =
    generatedAtText === "-" ? ["-", "-"] : generatedAtText.split(" ");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Database className="w-16 h-16 text-primary mx-auto animate-pulse" />
          <h2 className="text-lg font-medium text-foreground">
            데이터 로딩 중...
          </h2>
          <p className="text-sm text-muted-foreground">
            DB에서 집계 결과를 불러오고 있습니다
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-foreground">
              데이터 로딩 실패
            </h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Service Overview
              </h1>
              <p className="text-xs text-muted-foreground">
                Executive Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/guide">
              <button
                type="button"
                className="hidden sm:inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Book className="w-4 h-4" />
                컴포넌트 가이드
              </button>
            </Link>
            <DateFilter
              startDate={dateRange.start}
              endDate={dateRange.end}
              onDateChange={handleDateChange}
              onRefresh={handleRefresh}
              lastUpdated={lastUpdated}
            />

            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-border hover:border-primary/20 transition-colors"
              title="System Health Status"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  health.status === "ok"
                    ? "bg-[#3FB950] ring-4 ring-[#3FB950]/20"
                    : "bg-[#F85149]"
                }`}
              />
              <span
                className={`text-xs ${
                  health.status === "ok"
                    ? "text-muted-foreground"
                    : "text-[#F85149]"
                }`}
              >
                {health.status === "ok" ? "Live" : "Down"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Updated{" "}
                {health.lastSuccessAt
                  ? format(health.lastSuccessAt, "HH:mm:ss")
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Quick Insights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestTrends?.map((item) => (
              <div
                key={item.title}
                className={cn(
                  "p-4 rounded-xl border bg-card/50 backdrop-blur-sm relative overflow-hidden group transition-all hover:scale-[1.02]",
                  item.border,
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                    item.bg,
                  )}
                />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {item.title}
                    </span>
                    <item.icon className={cn("w-4 h-4", item.color)} />
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        {item.valueText}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.unit}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
                        item.trend > 0
                          ? "text-green-500 bg-green-500/10"
                          : item.trend < 0
                            ? "text-red-500 bg-red-500/10"
                            : "text-muted-foreground bg-muted/10",
                      )}
                    >
                      {item.trend > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : item.trend < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      {item.trend > 0 ? "+" : ""}
                      {item.trend.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Key Performance Indicators
            </h2>
            <span className="text-xs text-muted-foreground">
              {format(dateRange.start, "yyyy.MM.dd")} -{" "}
              {format(dateRange.end, "yyyy.MM.dd")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <KPICard key={kpi.id} data={kpi} />
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Trends
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {trendCharts.map((chart) => (
              <TrendChart key={chart.id} data={chart} height={200} />
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Breakdown Analysis
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {breakdownCharts.map((chart) => (
              <BreakdownChart key={chart.id} data={chart} height={280} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            User Directory
          </h2>
          <UserTable startDate={dateRange.start} endDate={dateRange.end} />
        </section>

        <footer className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>데이터 소스: invites_loop (PostgreSQL)</span>
              <span className="hidden sm:inline mx-2">·</span>
              <span>시간대: Asia/Seoul</span>
              <span className="hidden sm:inline mx-2">·</span>
              <span>화폐 단위: USD</span>
            </div>
            <div className="flex items-center gap-2">
              <span>데이터 기준: {generatedAtDate}</span>
              <span className="hidden sm:inline">{generatedAtTime}</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
