/**
 * KPI 계산 로직
 *
 * Service Overview 대시보드의 8개 KPI 카드 데이터를 계산합니다.
 * 모든 계산은 CSV 데이터 기반으로 수행됩니다.
 */

interface DashboardData {
  userProfiles: unknown[];
  userEventLog: Array<{
    user_id: string;
    created_at: string;
  }>;
  llmUsage: Array<{
    call_type?: string;
    cost_usd: string;
    status?: string;
    error_message?: string;
    error_code?: string;
    ts: string;
  }>;
  processingJobs: Array<{
    started_at: string;
    status?: string;
    error?: string;
  }>;
  dailyRoutineActivities: Array<{
    ymd: string;
    completed_at?: string;
    domain?: string;
  }>;
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// KPI 상태 타입
export type KPIStatus = "success" | "warning" | "danger";

// KPI 데이터 인터페이스
export interface KPIData {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  unit: string;
  status: KPIStatus;
  trend: number; // 전일 대비 변화율 (%)
  trendDirection: "up" | "down" | "flat";
  sparklineData: number[];
  description: string;
}

// 날짜 범위 내 데이터 필터링
function filterByDateRange<T extends Record<string, string>>(
  data: T[],
  dateField: string,
  startDate: Date,
  endDate: Date,
): T[] {
  return data.filter((row) => {
    const dateValue = row[dateField];
    if (!dateValue) return false;

    const normalized = normalizeDate(dateValue);
    if (!normalized) return false;

    const date = new Date(normalized);
    return date >= startDate && date <= endDate;
  });
}

// 일별 그룹핑
function groupByDay<T extends Record<string, string>>(
  data: T[],
  dateField: string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  data.forEach((row) => {
    const dateValue = row[dateField];
    if (!dateValue) return;

    const normalized = normalizeDate(dateValue);
    if (!normalized) return;

    // YYYY-MM-DD 형식으로 그룹핑
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized)!.push(row);
  });

  return groups;
}

// 숫자 포맷팅
function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(num);
}

// 비율 포맷팅
function formatPercent(num: number): string {
  return num.toFixed(1) + "%";
}

// 금액 포맷팅
function formatCurrency(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// KPI 상태 결정 (임계값 기반)
function determineStatus(
  value: number,
  thresholds: { warning: number; danger: number },
  higherIsBetter: boolean = true,
): KPIStatus {
  if (higherIsBetter) {
    if (value >= thresholds.warning) return "success";
    if (value >= thresholds.danger) return "warning";
    return "danger";
  } else {
    if (value <= thresholds.warning) return "success";
    if (value <= thresholds.danger) return "warning";
    return "danger";
  }
}

// 스파크라인 데이터 생성 (최근 7일)
function generateSparklineData(
  dailyGroups: Map<string, unknown[]>,
  days: number = 7,
): number[] {
  const sortedDays = Array.from(dailyGroups.keys()).sort();
  const recentDays = sortedDays.slice(-days);
  return recentDays.map((day) => dailyGroups.get(day)?.length || 0);
}

/**
 * 모든 KPI 계산
 */
export function calculateKPIs(
  data: DashboardData,
  startDate: Date,
  endDate: Date,
): KPIData[] {
  const kpis: KPIData[] = [];

  // 1. 총 사용자 수 (user_profiles 기준)
  const totalUsers = data.userProfiles.length;
  kpis.push({
    id: "total_users",
    title: "총 사용자 수",
    value: totalUsers,
    formattedValue: formatNumber(totalUsers),
    unit: "명",
    status: determineStatus(totalUsers, { warning: 50, danger: 20 }),
    trend: 0,
    trendDirection: "flat",
    sparklineData: [
      totalUsers,
      totalUsers,
      totalUsers,
      totalUsers,
      totalUsers,
      totalUsers,
      totalUsers,
    ],
    description: "user_profiles 테이블 기준 전체 등록 사용자",
  });

  // 2. 활성 사용자 (DAU - user_event_log 기반)
  const filteredEvents = filterByDateRange(
    data.userEventLog,
    "created_at",
    startDate,
    endDate,
  );
  const uniqueActiveUsers = new Set(filteredEvents.map((e) => e.user_id)).size;
  const eventsByDay = groupByDay(filteredEvents, "created_at");
  const dauSparkline = generateSparklineData(
    new Map(
      Array.from(eventsByDay.entries()).map(([day, events]) => [
        day,
        Array.from(new Set(events.map((e) => e.user_id))),
      ]),
    ),
    7,
  );

  kpis.push({
    id: "active_users",
    title: "활성 사용자 (DAU)",
    value: uniqueActiveUsers,
    formattedValue: formatNumber(uniqueActiveUsers),
    unit: "명",
    status: determineStatus(uniqueActiveUsers, { warning: 30, danger: 10 }),
    trend:
      dauSparkline.length >= 2
        ? ((dauSparkline[dauSparkline.length - 1] -
            dauSparkline[dauSparkline.length - 2]) /
            (dauSparkline[dauSparkline.length - 2] || 1)) *
          100
        : 0,
    trendDirection:
      dauSparkline.length >= 2
        ? dauSparkline[dauSparkline.length - 1] >
          dauSparkline[dauSparkline.length - 2]
          ? "up"
          : dauSparkline[dauSparkline.length - 1] <
              dauSparkline[dauSparkline.length - 2]
            ? "down"
            : "flat"
        : "flat",
    sparklineData:
      dauSparkline.length > 0 ? dauSparkline : [0, 0, 0, 0, 0, 0, 0],
    description: "user_event_log 기반 기간 내 고유 활성 사용자",
  });

  // 3. 루틴 생성 호출 수 (llm_usage.call_type = daily_routine_generation)
  const filteredLlm = filterByDateRange(
    data.llmUsage,
    "ts",
    startDate,
    endDate,
  );
  const routineGenCalls = filteredLlm.filter(
    (l) => l.call_type === "daily_routine_generation",
  );
  const routineGenByDay = groupByDay(routineGenCalls, "ts");

  kpis.push({
    id: "routine_gen_calls",
    title: "루틴 생성 호출",
    value: routineGenCalls.length,
    formattedValue: formatNumber(routineGenCalls.length),
    unit: "건",
    status: determineStatus(routineGenCalls.length, {
      warning: 100,
      danger: 30,
    }),
    trend: 0,
    trendDirection: "flat",
    sparklineData: generateSparklineData(routineGenByDay),
    description: "LLM daily_routine_generation 호출 수",
  });

  // 4. 주간플랜 생성 호출 수 (llm_usage.call_type = weekly_plan_generation)
  const weeklyPlanCalls = filteredLlm.filter(
    (l) => l.call_type === "weekly_plan_generation",
  );
  const weeklyPlanByDay = groupByDay(weeklyPlanCalls, "ts");

  kpis.push({
    id: "weekly_plan_calls",
    title: "주간플랜 생성 호출",
    value: weeklyPlanCalls.length,
    formattedValue: formatNumber(weeklyPlanCalls.length),
    unit: "건",
    status: determineStatus(weeklyPlanCalls.length, {
      warning: 50,
      danger: 10,
    }),
    trend: 0,
    trendDirection: "flat",
    sparklineData: generateSparklineData(weeklyPlanByDay),
    description: "LLM weekly_plan_generation 호출 수",
  });

  // 5. LLM 총 비용 (cost_usd 합)
  const totalLlmCost = filteredLlm.reduce((sum, l) => {
    const cost = parseFloat(l.cost_usd) || 0;
    return sum + cost;
  }, 0);
  const llmCostByDay = new Map<string, number>();
  filteredLlm.forEach((l) => {
    const date = new Date(l.ts);
    const dayKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const current = llmCostByDay.get(dayKey) || 0;
    llmCostByDay.set(dayKey, current + (parseFloat(l.cost_usd) || 0));
  });
  const costSparkline = Array.from(llmCostByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([, cost]) => cost);

  kpis.push({
    id: "llm_total_cost",
    title: "LLM 총 비용",
    value: totalLlmCost,
    formattedValue: formatCurrency(totalLlmCost),
    unit: "",
    status: determineStatus(totalLlmCost, { warning: 100, danger: 500 }, false),
    trend:
      costSparkline.length >= 2
        ? ((costSparkline[costSparkline.length - 1] -
            costSparkline[costSparkline.length - 2]) /
            (costSparkline[costSparkline.length - 2] || 1)) *
          100
        : 0,
    trendDirection:
      costSparkline.length >= 2
        ? costSparkline[costSparkline.length - 1] >
          costSparkline[costSparkline.length - 2]
          ? "up"
          : "down"
        : "flat",
    sparklineData:
      costSparkline.length > 0 ? costSparkline : [0, 0, 0, 0, 0, 0, 0],
    description: "기간 내 LLM API 비용 합계",
  });

  // 6. LLM 에러율 (status=error 비율)
  const llmErrors = filteredLlm.filter((l) => l.status === "error");
  const llmErrorRate =
    filteredLlm.length > 0 ? (llmErrors.length / filteredLlm.length) * 100 : 0;

  kpis.push({
    id: "llm_error_rate",
    title: "LLM 에러율",
    value: llmErrorRate,
    formattedValue: formatPercent(llmErrorRate),
    unit: "",
    status: determineStatus(llmErrorRate, { warning: 5, danger: 10 }, false),
    trend: 0,
    trendDirection: "flat",
    sparklineData: [
      llmErrorRate,
      llmErrorRate,
      llmErrorRate,
      llmErrorRate,
      llmErrorRate,
      llmErrorRate,
      llmErrorRate,
    ],
    description: "LLM 호출 중 에러 발생 비율",
  });

  // 7. 잡 실패율 (processing_jobs status=failed 비율)
  const filteredJobs = filterByDateRange(
    data.processingJobs,
    "started_at",
    startDate,
    endDate,
  );
  const failedJobs = filteredJobs.filter((j) => j.status === "failed");
  const jobFailRate =
    filteredJobs.length > 0
      ? (failedJobs.length / filteredJobs.length) * 100
      : 0;
  const jobsByDay = groupByDay(filteredJobs, "started_at");
  const failedByDay = groupByDay(failedJobs, "started_at");
  const failRateSparkline = Array.from(jobsByDay.keys())
    .sort()
    .slice(-7)
    .map((day) => {
      const total = jobsByDay.get(day)?.length || 0;
      const failed = failedByDay.get(day)?.length || 0;
      return total > 0 ? (failed / total) * 100 : 0;
    });

  kpis.push({
    id: "job_fail_rate",
    title: "잡 실패율",
    value: jobFailRate,
    formattedValue: formatPercent(jobFailRate),
    unit: "",
    status: determineStatus(jobFailRate, { warning: 10, danger: 20 }, false),
    trend:
      failRateSparkline.length >= 2
        ? failRateSparkline[failRateSparkline.length - 1] -
          failRateSparkline[failRateSparkline.length - 2]
        : 0,
    trendDirection:
      failRateSparkline.length >= 2
        ? failRateSparkline[failRateSparkline.length - 1] >
          failRateSparkline[failRateSparkline.length - 2]
          ? "up"
          : "down"
        : "flat",
    sparklineData:
      failRateSparkline.length > 0 ? failRateSparkline : [0, 0, 0, 0, 0, 0, 0],
    description: "processing_jobs 실패 비율",
  });

  // 8. 루틴 수행률 (daily_routine_activities completed_at not null 비율)
  const filteredActivities = filterByDateRange(
    data.dailyRoutineActivities,
    "ymd",
    startDate,
    endDate,
  );
  const completedActivities = filteredActivities.filter(
    (a) => a.completed_at && a.completed_at !== "",
  );
  const routineCompletionRate =
    filteredActivities.length > 0
      ? (completedActivities.length / filteredActivities.length) * 100
      : 0;
  const activitiesByDay = groupByDay(filteredActivities, "ymd");
  const completedByDay = groupByDay(completedActivities, "ymd");
  const completionSparkline = Array.from(activitiesByDay.keys())
    .sort()
    .slice(-7)
    .map((day) => {
      const total = activitiesByDay.get(day)?.length || 0;
      const completed = completedByDay.get(day)?.length || 0;
      return total > 0 ? (completed / total) * 100 : 0;
    });

  kpis.push({
    id: "routine_completion_rate",
    title: "루틴 수행률",
    value: routineCompletionRate,
    formattedValue: formatPercent(routineCompletionRate),
    unit: "",
    status: determineStatus(routineCompletionRate, { warning: 50, danger: 30 }),
    trend:
      completionSparkline.length >= 2
        ? completionSparkline[completionSparkline.length - 1] -
          completionSparkline[completionSparkline.length - 2]
        : 0,
    trendDirection:
      completionSparkline.length >= 2
        ? completionSparkline[completionSparkline.length - 1] >
          completionSparkline[completionSparkline.length - 2]
          ? "up"
          : "down"
        : "flat",
    sparklineData:
      completionSparkline.length > 0
        ? completionSparkline
        : [0, 0, 0, 0, 0, 0, 0],
    description: "daily_routine_activities 수행 비율",
  });

  return kpis;
}

/**
 * 추이 차트 데이터 계산
 */
export interface TrendChartData {
  id: string;
  title: string;
  data: { date: string; value: number; label?: string }[];
  yAxisLabel: string;
  color: string;
  description?: string;
}

export function calculateTrendCharts(
  data: DashboardData,
  startDate: Date,
  endDate: Date,
): TrendChartData[] {
  const charts: TrendChartData[] = [];

  // 1. DAU 추이
  const filteredEvents = filterByDateRange(
    data.userEventLog,
    "created_at",
    startDate,
    endDate,
  );
  const eventsByDay = groupByDay(filteredEvents, "created_at");
  const dauData = Array.from(eventsByDay.entries())
    .map(([day, events]) => ({
      date: day,
      value: new Set(events.map((e) => e.user_id)).size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  charts.push({
    id: "dau_trend",
    title: "DAU 추이",
    data: dauData,
    yAxisLabel: "활성 사용자 수",
    color: "#58A6FF",
  });

  // 2. LLM 비용/호출 추이
  const filteredLlm = filterByDateRange(
    data.llmUsage,
    "ts",
    startDate,
    endDate,
  );
  const llmByDay = new Map<string, { cost: number; calls: number }>();
  filteredLlm.forEach((l) => {
    const date = new Date(l.ts);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const current = llmByDay.get(dayKey) || { cost: 0, calls: 0 };
    llmByDay.set(dayKey, {
      cost: current.cost + (parseFloat(l.cost_usd) || 0),
      calls: current.calls + 1,
    });
  });
  const llmCostData = Array.from(llmByDay.entries())
    .map(([date, { cost }]) => ({ date, value: cost }))
    .sort((a, b) => a.date.localeCompare(b.date));

  charts.push({
    id: "llm_cost_trend",
    title: "LLM 비용 추이 (일별)",
    data: llmCostData,
    yAxisLabel: "비용 (USD)",
    color: "#D29922",
  });

  // 3. 잡 실패율 추이
  const filteredJobs = filterByDateRange(
    data.processingJobs,
    "started_at",
    startDate,
    endDate,
  );
  const jobsByDay = new Map<string, { total: number; failed: number }>();
  filteredJobs.forEach((j) => {
    const date = new Date(j.started_at);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const current = jobsByDay.get(dayKey) || { total: 0, failed: 0 };
    jobsByDay.set(dayKey, {
      total: current.total + 1,
      failed: current.failed + (j.status === "failed" ? 1 : 0),
    });
  });
  const jobFailData = Array.from(jobsByDay.entries())
    .map(([date, { total, failed }]) => ({
      date,
      value: total > 0 ? (failed / total) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  charts.push({
    id: "job_fail_trend",
    title: "잡 실패율 추이 (일별)",
    data: jobFailData,
    yAxisLabel: "실패율 (%)",
    color: "#F85149",
  });

  return charts;
}

/**
 * 분해 차트 데이터 계산
 */
export interface BreakdownChartData {
  id: string;
  title: string;
  data: {
    name: string;
    value: number;
    percentage?: number;
    completed?: number;
    total?: number;
  }[];
  type: "bar" | "pie" | "table";
  description?: string;
}

export function calculateBreakdownCharts(
  data: DashboardData,
  startDate: Date,
  endDate: Date,
): BreakdownChartData[] {
  const charts: BreakdownChartData[] = [];

  // 1. feature_key/call_type별 비용 Top
  const filteredLlm = filterByDateRange(
    data.llmUsage,
    "ts",
    startDate,
    endDate,
  );
  const costByCallType = new Map<string, number>();
  filteredLlm.forEach((l) => {
    const callType = l.call_type || "unknown";
    const current = costByCallType.get(callType) || 0;
    costByCallType.set(callType, current + (parseFloat(l.cost_usd) || 0));
  });
  const totalCost = Array.from(costByCallType.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const costData = Array.from(costByCallType.entries())
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      percentage: totalCost > 0 ? (value / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  charts.push({
    id: "cost_by_call_type",
    title: "call_type별 비용 Top 10",
    data: costData,
    type: "bar",
  });

  // 2. 에러 코드/메시지 Top (LLM + jobs)
  const llmErrors = filteredLlm.filter((l) => l.status === "error");
  const filteredJobs = filterByDateRange(
    data.processingJobs,
    "started_at",
    startDate,
    endDate,
  );
  const jobErrors = filteredJobs.filter((j) => j.status === "failed");

  const errorCounts = new Map<string, number>();
  llmErrors.forEach((e) => {
    const errorKey = e.error_message || e.error_code || "Unknown LLM Error";
    const truncated =
      errorKey.length > 50 ? errorKey.slice(0, 50) + "..." : errorKey;
    errorCounts.set(truncated, (errorCounts.get(truncated) || 0) + 1);
  });
  jobErrors.forEach((j) => {
    const errorKey = j.error || "Unknown Job Error";
    const truncated =
      errorKey.length > 50 ? errorKey.slice(0, 50) + "..." : errorKey;
    errorCounts.set(truncated, (errorCounts.get(truncated) || 0) + 1);
  });

  const totalErrors = Array.from(errorCounts.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const errorData = Array.from(errorCounts.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalErrors > 0 ? (value / totalErrors) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  charts.push({
    id: "error_top",
    title: "에러 메시지 Top 10",
    data: errorData,
    type: "table",
  });

  // 3. domain별 루틴 완료율
  const filteredActivities = filterByDateRange(
    data.dailyRoutineActivities,
    "ymd",
    startDate,
    endDate,
  );
  const domainStats = new Map<string, { total: number; completed: number }>();
  filteredActivities.forEach((a) => {
    const domain = a.domain || "unknown";
    const current = domainStats.get(domain) || { total: 0, completed: 0 };
    domainStats.set(domain, {
      total: current.total + 1,
      completed:
        current.completed + (a.completed_at && a.completed_at !== "" ? 1 : 0),
    });
  });

  const domainData = Array.from(domainStats.entries())
    .map(([name, { total, completed }]) => ({
      name,
      value: total > 0 ? (completed / total) * 100 : 0,
      percentage: total,
    }))
    .sort((a, b) => b.percentage! - a.percentage!);

  charts.push({
    id: "domain_completion",
    title: "domain별 루틴 완료율",
    data: domainData,
    type: "bar",
  });

  return charts;
}
