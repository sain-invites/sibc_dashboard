/**
 * Service Overview API
 *
 * 대시보드 메인 화면용 KPI, 트렌드, 분해 차트 데이터 제공
 *
 * 리뷰 반영 사항:
 * - llm_usage: ts 컬럼 사용 (created_at 아님)
 * - daily_routine_activities: ymd 기반 필터링 (completed_at 아님)
 * - 스키마 표기: sibc.table (3단 표기 제거)
 */

import { Router, Request, Response } from "express";
import { queryMany, queryOne } from "../db.js";

const router = Router();

// ============================================
// 타입 정의
// ============================================

interface KPI {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  unit: string;
  status: "success" | "warning" | "danger";
  trend: number;
  trendDirection: "up" | "down" | "flat";
  description: string;
}

interface TrendPoint {
  date: string;
  value: number;
}

interface BreakdownItem {
  name: string;
  value: number;
  percentage?: number;
  completed?: number;
  total?: number;
}

interface OverviewResponse {
  kpis: KPI[];
  trends: {
    newUsers: TrendPoint[];
    returningUsers: TrendPoint[];
    dau: TrendPoint[];
    dailyEvents: TrendPoint[];
    avgEventsPerUser: TrendPoint[];
    routineCompleted: TrendPoint[];
    routineCompletionRate: TrendPoint[];
    llmErrorRate: TrendPoint[];
    llmCostPerCall: TrendPoint[];
  };
  breakdown: {
    llmCostByType: BreakdownItem[];
    llmCostByModel: BreakdownItem[];
    llmErrorTop10: BreakdownItem[];
    completionByDomain: BreakdownItem[];
    completionByPriority: BreakdownItem[];
    completionByPeriod: BreakdownItem[];
  };
  meta: {
    startDate: string;
    endDate: string;
    generatedAt: string;
  };
}

// ============================================
// SQL 쿼리 (리뷰 반영)
// ============================================

const SQL = {
  // 총 사용자 수
  totalUsers: `
    SELECT COUNT(DISTINCT user_id)::int as count 
    FROM user_profiles
  `,

  // DAU (일별 활성 사용자)
  dauTrend: `
    WITH date_series AS (
      SELECT generate_series($1::date, $2::date, interval '1 day')::date AS date
    ),
    dau AS (
      SELECT 
        (created_at AT TIME ZONE 'Asia/Seoul')::date AS date,
        COUNT(DISTINCT user_id)::int AS count
      FROM user_event_log
      WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
      GROUP BY 1
    )
    SELECT 
      date_series.date AS date,
      COALESCE(dau.count, 0)::int AS count
    FROM date_series
    LEFT JOIN dau ON dau.date = date_series.date
    ORDER BY date_series.date
  `,

  // WAU/MAU (기간 내 활성 사용자 수)
  activeUsersInRange: `
    SELECT COUNT(DISTINCT user_id)::int as count
    FROM user_event_log
    WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
  `,

  // 이벤트 요약
  eventSummary: `
    SELECT
      COUNT(*)::int as total_events,
      COUNT(DISTINCT user_id)::int as users
    FROM user_event_log
    WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
  `,

  // 일별 이벤트 수
  dailyEvents: `
    SELECT
      (created_at AT TIME ZONE 'Asia/Seoul')::date AS date,
      COUNT(*)::int AS count
    FROM user_event_log
    WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
    GROUP BY 1
    ORDER BY 1
  `,

  // 신규 사용자 (최초 이벤트 날짜 기준)
  dailyNewUsers: `
    WITH first_event AS (
      SELECT
        user_id,
        MIN((created_at AT TIME ZONE 'Asia/Seoul')::date) AS first_date
      FROM user_event_log
      GROUP BY user_id
    )
    SELECT
      first_date AS date,
      COUNT(*)::int AS count
    FROM first_event
    WHERE first_date BETWEEN $1::date AND $2::date
    GROUP BY 1
    ORDER BY 1
  `,

  // 일별 루틴 완료/전체
  dailyRoutineCompletion: `
    SELECT
      to_date(ymd::text, 'YYYYMMDD') AS date,
      COUNT(*)::int AS total,
      SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)::int AS completed
    FROM daily_routine_activities
    WHERE to_date(ymd::text, 'YYYYMMDD') BETWEEN $1::date AND $2::date
    GROUP BY 1
    ORDER BY 1
  `,

  // 일별 LLM 사용 요약
  dailyLlmUsage: `
    SELECT
      (ts AT TIME ZONE 'Asia/Seoul')::date AS date,
      COUNT(*)::int AS total,
      SUM(cost_usd)::numeric AS cost,
      SUM(
        CASE WHEN status = 'error' OR error_code IS NOT NULL THEN 1 ELSE 0 END
      )::int AS errors
    FROM llm_usage
    WHERE (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
    GROUP BY 1
    ORDER BY 1
  `,

  // 루틴 생성 호출 수 (LLM 호출, call_type 기준)
  routineCreationCalls: `
    SELECT COUNT(*)::int as count
    FROM llm_usage
    WHERE call_type = 'daily_routine_generation'
      AND (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
  `,

  // 주간플랜 생성 호출 수 (LLM 호출, call_type 기준)
  weeklyPlanCalls: `
    SELECT COUNT(*)::int as count
    FROM llm_usage
    WHERE call_type = 'weekly_plan_generation'
      AND (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
  `,

  // LLM 비용 추이 (ts 컬럼 사용 - 리뷰 반영)
  llmCostTrend: `
    SELECT
      (ts AT TIME ZONE 'Asia/Seoul')::date AS date,
      SUM(cost_usd)::numeric AS cost,
      COUNT(*)::int AS calls
    FROM llm_usage
    WHERE (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
    GROUP BY 1
    ORDER BY 1
  `,

  // LLM 에러율
  llmErrorRate: `
    SELECT 
      COUNT(*)::int as total,
      SUM(CASE WHEN status = 'error' OR error_code IS NOT NULL THEN 1 ELSE 0 END)::int as errors
    FROM llm_usage
    WHERE (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
  `,

  // 잡 실패율 추이
  jobFailureRateTrend: `
    SELECT 
      (started_at AT TIME ZONE 'Asia/Seoul')::date as date,
      COUNT(*)::int as total,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int as failed
    FROM processing_jobs
    WHERE (started_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
    GROUP BY 1
    ORDER BY date
  `,

  // 루틴 수행률 (ymd 기반 필터링 - 리뷰 반영)
  routineCompletionRate: `
    SELECT 
      COUNT(*)::int as total,
      SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)::int as completed
    FROM daily_routine_activities
    WHERE to_date(ymd::text, 'YYYYMMDD') BETWEEN $1::date AND $2::date
  `,

  // LLM 비용 by call_type
  llmCostByType: `
    SELECT 
      call_type as name,
      SUM(cost_usd)::numeric as value
    FROM llm_usage
    WHERE (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
      AND call_type IS NOT NULL
      AND call_type <> ''
    GROUP BY call_type
    ORDER BY value DESC
    LIMIT 10
  `,

  // LLM 비용 by model
  llmCostByModel: `
    SELECT 
      model as name,
      SUM(cost_usd)::numeric as value
    FROM llm_usage
    WHERE (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
      AND model IS NOT NULL
      AND NULLIF(TRIM(model), '') IS NOT NULL
      AND LOWER(TRIM(model)) <> 'unknown'
    GROUP BY model
    ORDER BY value DESC
    LIMIT 10
  `,

  // LLM 에러 Top 10
  llmErrorTop10: `
    SELECT
      COALESCE(error_message, error_code, 'Unknown Error') as name,
      COUNT(*)::int as value
    FROM llm_usage
    WHERE (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
      AND (status = 'error' OR error_code IS NOT NULL)
    GROUP BY name
    ORDER BY value DESC
    LIMIT 10
  `,

  // 도메인별 완료율 (ymd 기반 - 리뷰 반영)
  completionByDomain: `
    SELECT 
      domain as name,
      COUNT(*)::int as total,
      SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)::int as completed
    FROM daily_routine_activities
    WHERE to_date(ymd::text, 'YYYYMMDD') BETWEEN $1::date AND $2::date
      AND domain IS NOT NULL
      AND domain <> ''
    GROUP BY domain
    ORDER BY total DESC
  `,

  // 우선순위별 완료율 (ymd 기반)
  completionByPriority: `
    SELECT 
      priority::text as name,
      COUNT(*)::int as total,
      SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)::int as completed
    FROM daily_routine_activities
    WHERE to_date(ymd::text, 'YYYYMMDD') BETWEEN $1::date AND $2::date
      AND priority IS NOT NULL
      AND priority::text <> ''
    GROUP BY priority
    ORDER BY
      CASE
        WHEN priority::text = 'required' THEN 1
        WHEN priority::text = 'optional' THEN 2
        ELSE 3
      END,
      total DESC
  `,

  // 루틴 시간대별 완료율 (ymd 기반)
  completionByPeriod: `
    SELECT 
      activity_period as name,
      COUNT(*)::int as total,
      SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)::int as completed
    FROM daily_routine_activities
    WHERE to_date(ymd::text, 'YYYYMMDD') BETWEEN $1::date AND $2::date
      AND activity_period IS NOT NULL
      AND activity_period <> ''
    GROUP BY activity_period
    ORDER BY
      CASE activity_period
        WHEN 'anytime' THEN 1
        WHEN 'morning' THEN 2
        WHEN 'lunch' THEN 3
        WHEN 'afternoon' THEN 4
        WHEN 'evening' THEN 5
        WHEN 'dinner' THEN 6
        WHEN 'night' THEN 7
        ELSE 99
      END,
      total DESC
  `,
};

// ============================================
// 헬퍼 함수
// ============================================

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(num);
}

function formatNumberWithDecimals(num: number, decimals: number = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

function formatCurrencyUSD(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function getStatus(
  value: number,
  warningThreshold: number,
  dangerThreshold: number,
  inverse: boolean = false,
): "success" | "warning" | "danger" {
  if (inverse) {
    if (value >= dangerThreshold) return "danger";
    if (value >= warningThreshold) return "warning";
    return "success";
  }
  if (value <= dangerThreshold) return "danger";
  if (value <= warningThreshold) return "warning";
  return "success";
}

const KST_TIME_ZONE = "Asia/Seoul";

function formatDateKST(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDateParam(param: unknown): string | null {
  if (typeof param !== "string" || param.trim() === "") return null;
  return param;
}

function dateFromKstString(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+09:00`);
}

function buildDateSeries(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (
    let cursor = new Date(startDate.getTime());
    cursor <= endDate;
    cursor = new Date(cursor.getTime() + dayMs)
  ) {
    dates.push(formatDateKST(cursor));
  }
  return dates;
}

function formatDateFromDb(date: Date): string {
  return formatDateKST(date);
}

function calculateTrend(
  current: number,
  previous: number,
): { trend: number; direction: "up" | "down" | "flat" } {
  if (previous === 0) return { trend: 0, direction: "flat" };
  const trend = ((current - previous) / previous) * 100;
  return {
    trend: Math.abs(trend),
    direction: trend > 1 ? "up" : trend < -1 ? "down" : "flat",
  };
}

// ============================================
// API 엔드포인트
// ============================================

router.get("/", async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;

    // 기본값: 최근 30일
    const endStr = parseDateParam(end) ?? formatDateKST(new Date());
    const endDate = dateFromKstString(endStr);
    const startStr =
      parseDateParam(start) ??
      formatDateKST(new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000));
    const startDate = dateFromKstString(startStr);
    const dayMs = 24 * 60 * 60 * 1000;
    const wauStartDate = new Date(
      Math.max(startDate.getTime(), endDate.getTime() - 6 * dayMs),
    );
    const mauStartDate = new Date(
      Math.max(startDate.getTime(), endDate.getTime() - 29 * dayMs),
    );
    const wauStartStr = formatDateKST(wauStartDate);
    const mauStartStr = formatDateKST(mauStartDate);
    const daysInRange =
      Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1;

    // 병렬 쿼리 실행
    const [
      totalUsersResult,
      dauTrendResult,
      wauResult,
      mauResult,
      routineCallsResult,
      weeklyPlanCallsResult,
      llmCostTrendResult,
      llmErrorResult,
      jobFailureTrendResult,
      routineCompletionResult,
      eventSummaryResult,
      dailyEventsResult,
      dailyNewUsersResult,
      dailyRoutineCompletionResult,
      dailyLlmUsageResult,
      llmCostByTypeResult,
      llmCostByModelResult,
      llmErrorTop10Result,
      completionByDomainResult,
      completionByPriorityResult,
      completionByPeriodResult,
    ] = await Promise.all([
      queryOne<{ count: number }>(SQL.totalUsers),
      queryMany<{ date: Date; count: number }>(SQL.dauTrend, [
        startStr,
        endStr,
      ]),
      queryOne<{ count: number }>(SQL.activeUsersInRange, [
        wauStartStr,
        endStr,
      ]),
      queryOne<{ count: number }>(SQL.activeUsersInRange, [
        mauStartStr,
        endStr,
      ]),
      queryOne<{ count: number }>(SQL.routineCreationCalls, [startStr, endStr]),
      queryOne<{ count: number }>(SQL.weeklyPlanCalls, [startStr, endStr]),
      queryMany<{ date: Date; cost: number; calls: number }>(SQL.llmCostTrend, [
        startStr,
        endStr,
      ]),
      queryOne<{ total: number; errors: number }>(SQL.llmErrorRate, [
        startStr,
        endStr,
      ]),
      queryMany<{ date: Date; total: number; failed: number }>(
        SQL.jobFailureRateTrend,
        [startStr, endStr],
      ),
      queryOne<{ total: number; completed: number }>(
        SQL.routineCompletionRate,
        [startStr, endStr],
      ),
      queryOne<{ total_events: number; users: number }>(SQL.eventSummary, [
        startStr,
        endStr,
      ]),
      queryMany<{ date: Date; count: number }>(SQL.dailyEvents, [
        startStr,
        endStr,
      ]),
      queryMany<{ date: Date; count: number }>(SQL.dailyNewUsers, [
        startStr,
        endStr,
      ]),
      queryMany<{ date: Date; total: number; completed: number }>(
        SQL.dailyRoutineCompletion,
        [startStr, endStr],
      ),
      queryMany<{ date: Date; total: number; cost: number; errors: number }>(
        SQL.dailyLlmUsage,
        [startStr, endStr],
      ),
      queryMany<{ name: string; value: number }>(SQL.llmCostByType, [
        startStr,
        endStr,
      ]),
      queryMany<{ name: string; value: number }>(SQL.llmCostByModel, [
        startStr,
        endStr,
      ]),
      queryMany<{ name: string; value: number }>(SQL.llmErrorTop10, [
        startStr,
        endStr,
      ]),
      queryMany<{ name: string; total: number; completed: number }>(
        SQL.completionByDomain,
        [startStr, endStr],
      ),
      queryMany<{ name: string; total: number; completed: number }>(
        SQL.completionByPriority,
        [startStr, endStr],
      ),
      queryMany<{ name: string; total: number; completed: number }>(
        SQL.completionByPeriod,
        [startStr, endStr],
      ),
    ]);

    // KPI 계산
    const totalUsers = totalUsersResult?.count || 0;
    const latestDau = dauTrendResult[dauTrendResult.length - 1]?.count || 0;
    const previousDau = dauTrendResult[dauTrendResult.length - 2]?.count || 0;
    const dauTrend = calculateTrend(latestDau, previousDau);

    const routineCalls = routineCallsResult?.count || 0;
    const weeklyPlanCalls = weeklyPlanCallsResult?.count || 0;

    const totalLlmCost = llmCostTrendResult.reduce(
      (sum, d) => sum + Number(d.cost),
      0,
    );
    const llmErrorRate = llmErrorResult?.total
      ? (llmErrorResult.errors / llmErrorResult.total) * 100
      : 0;

    const totalJobs = jobFailureTrendResult.reduce(
      (sum, d) => sum + d.total,
      0,
    );
    const failedJobs = jobFailureTrendResult.reduce(
      (sum, d) => sum + d.failed,
      0,
    );
    const jobFailureRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

    const routineTotal = routineCompletionResult?.total || 0;
    const routineCompleted = routineCompletionResult?.completed || 0;
    const routineCompletionRate =
      routineTotal > 0 ? (routineCompleted / routineTotal) * 100 : 0;
    const routineCompletedPerDay =
      daysInRange > 0 ? routineCompleted / daysInRange : 0;

    const wau = wauResult?.count || 0;
    const mau = mauResult?.count || 0;

    const totalEvents = eventSummaryResult?.total_events || 0;
    const eventUsers = eventSummaryResult?.users || 0;
    const avgEventsPerUser = eventUsers > 0 ? totalEvents / eventUsers : 0;

    const dateSeries = buildDateSeries(startDate, endDate);
    const dauByDate = new Map(
      dauTrendResult.map((d) => [formatDateFromDb(d.date), d.count]),
    );
    const newUsersByDate = new Map(
      dailyNewUsersResult.map((d) => [formatDateFromDb(d.date), d.count]),
    );
    const dailyEventsByDate = new Map(
      dailyEventsResult.map((d) => [formatDateFromDb(d.date), d.count]),
    );
    const routineByDate = new Map(
      dailyRoutineCompletionResult.map((d) => [
        formatDateFromDb(d.date),
        { total: d.total, completed: d.completed },
      ]),
    );
    const llmByDate = new Map(
      dailyLlmUsageResult.map((d) => [
        formatDateFromDb(d.date),
        { total: d.total, errors: d.errors, cost: Number(d.cost) },
      ]),
    );

    // KPI 배열 구성
    const kpis: KPI[] = [
      {
        id: "total-users",
        title: "총 사용자",
        value: totalUsers,
        formattedValue: formatNumber(totalUsers),
        unit: "명",
        status: "success",
        trend: 0,
        trendDirection: "flat",
        description: "전체 등록 사용자 수",
      },
      {
        id: "dau",
        title: "DAU",
        value: latestDau,
        formattedValue: formatNumber(latestDau),
        unit: "명",
        status: getStatus(latestDau, totalUsers * 0.1, totalUsers * 0.05),
        trend: dauTrend.trend,
        trendDirection: dauTrend.direction,
        description: "하루 기준 고유 활성 사용자 수",
      },
      {
        id: "wau",
        title: "WAU",
        value: wau,
        formattedValue: formatNumber(wau),
        unit: "명",
        status:
          totalUsers > 0
            ? getStatus(wau, totalUsers * 0.3, totalUsers * 0.15)
            : "success",
        trend: 0,
        trendDirection: "flat",
        description: "최근 7일 고유 활성 사용자 수",
      },
      {
        id: "mau",
        title: "MAU",
        value: mau,
        formattedValue: formatNumber(mau),
        unit: "명",
        status:
          totalUsers > 0
            ? getStatus(mau, totalUsers * 0.6, totalUsers * 0.3)
            : "success",
        trend: 0,
        trendDirection: "flat",
        description: "최근 30일 고유 활성 사용자 수",
      },
      {
        id: "routine-calls",
        title: "루틴 생성 호출",
        value: routineCalls,
        formattedValue: formatNumber(routineCalls),
        unit: "건",
        status: "success",
        trend: 0,
        trendDirection: "flat",
        description: "기간 내 루틴 생성 LLM 호출 건수",
      },
      {
        id: "weekly-plan-calls",
        title: "주간플랜 생성 호출",
        value: weeklyPlanCalls,
        formattedValue: formatNumber(weeklyPlanCalls),
        unit: "건",
        status: "success",
        trend: 0,
        trendDirection: "flat",
        description: "기간 내 주간플랜 생성 LLM 호출 건수",
      },
      {
        id: "routine-completion-rate",
        title: "루틴 수행률",
        value: routineCompletionRate,
        formattedValue: routineCompletionRate.toFixed(1) + "%",
        unit: "",
        status: getStatus(routineCompletionRate, 50, 30),
        trend: 0,
        trendDirection: "flat",
        description: "계획된 루틴 중 수행 완료 비율",
      },
      {
        id: "routine-completed-per-day",
        title: "루틴 수행 건수/일",
        value: routineCompletedPerDay,
        formattedValue: formatNumberWithDecimals(routineCompletedPerDay, 1),
        unit: "건/일",
        status: "success",
        trend: 0,
        trendDirection: "flat",
        description: "기간 내 하루 평균 수행 건수",
      },
      {
        id: "job-failure-rate",
        title: "잡 실패율",
        value: jobFailureRate,
        formattedValue: jobFailureRate.toFixed(1) + "%",
        unit: "",
        status: getStatus(jobFailureRate, 10, 20, true),
        trend: 0,
        trendDirection: "flat",
        description: "전체 잡 중 실패 비율",
      },
      {
        id: "llm-error-rate",
        title: "LLM 에러율",
        value: llmErrorRate,
        formattedValue: llmErrorRate.toFixed(1) + "%",
        unit: "",
        status: getStatus(llmErrorRate, 5, 10, true),
        trend: 0,
        trendDirection: "flat",
        description: "LLM 호출 중 에러 비율",
      },
      {
        id: "llm-cost",
        title: "LLM 비용",
        value: totalLlmCost,
        formattedValue: formatCurrencyUSD(totalLlmCost),
        unit: "",
        status: getStatus(totalLlmCost, 100, 500, true),
        trend: 0,
        trendDirection: "flat",
        description: "기간 내 LLM 총 비용",
      },
      {
        id: "avg-events-per-user",
        title: "사용자당 평균 이벤트 수",
        value: avgEventsPerUser,
        formattedValue: formatNumberWithDecimals(avgEventsPerUser, 1),
        unit: "건/명",
        status: "success",
        trend: 0,
        trendDirection: "flat",
        description: "활성 사용자 1명당 평균 이벤트 수",
      },
    ];

    // 트렌드 데이터 변환
    const trends = {
      newUsers: dateSeries.map((date) => ({
        date,
        value: newUsersByDate.get(date) ?? 0,
      })),
      returningUsers: dateSeries.map((date) => {
        const dau = dauByDate.get(date) ?? 0;
        const newUsers = newUsersByDate.get(date) ?? 0;
        return {
          date,
          value: Math.max(dau - newUsers, 0),
        };
      }),
      dau: dateSeries.map((date) => ({
        date,
        value: dauByDate.get(date) ?? 0,
      })),
      dailyEvents: dateSeries.map((date) => ({
        date,
        value: dailyEventsByDate.get(date) ?? 0,
      })),
      avgEventsPerUser: dateSeries.map((date) => {
        const events = dailyEventsByDate.get(date) ?? 0;
        const dau = dauByDate.get(date) ?? 0;
        return {
          date,
          value: dau > 0 ? events / dau : 0,
        };
      }),
      routineCompleted: dateSeries.map((date) => ({
        date,
        value: routineByDate.get(date)?.completed ?? 0,
      })),
      routineCompletionRate: dateSeries.map((date) => {
        const routine = routineByDate.get(date);
        const total = routine?.total ?? 0;
        const completed = routine?.completed ?? 0;
        return {
          date,
          value: total > 0 ? (completed / total) * 100 : 0,
        };
      }),
      llmErrorRate: dateSeries.map((date) => {
        const llm = llmByDate.get(date);
        const total = llm?.total ?? 0;
        const errors = llm?.errors ?? 0;
        return {
          date,
          value: total > 0 ? (errors / total) * 100 : 0,
        };
      }),
      llmCostPerCall: dateSeries.map((date) => {
        const llm = llmByDate.get(date);
        const total = llm?.total ?? 0;
        const cost = llm?.cost ?? 0;
        return {
          date,
          value: total > 0 ? cost / total : 0,
        };
      }),
    };

    // Breakdown 데이터 변환
    const breakdown = {
      llmCostByType: llmCostByTypeResult.map((d) => ({
        name: d.name,
        value: Number(d.value),
        percentage:
          totalLlmCost > 0 ? (Number(d.value) / totalLlmCost) * 100 : 0,
      })),
      llmCostByModel: llmCostByModelResult.map((d) => ({
        name: d.name,
        value: Number(d.value),
        percentage:
          totalLlmCost > 0 ? (Number(d.value) / totalLlmCost) * 100 : 0,
      })),
      llmErrorTop10: llmErrorTop10Result.map((d) => ({
        name: d.name || "Unknown Error",
        value: d.value,
      })),
      completionByDomain: completionByDomainResult.map((d) => ({
        name: d.name,
        value: d.total > 0 ? (d.completed / d.total) * 100 : 0,
        completed: d.completed,
        total: d.total,
      })),
      completionByPriority: completionByPriorityResult.map((d) => ({
        name: d.name,
        value: d.total > 0 ? (d.completed / d.total) * 100 : 0,
        completed: d.completed,
        total: d.total,
      })),
      completionByPeriod: completionByPeriodResult.map((d) => ({
        name: d.name,
        value: d.total > 0 ? (d.completed / d.total) * 100 : 0,
        completed: d.completed,
        total: d.total,
      })),
    };

    const response: OverviewResponse = {
      kpis,
      trends,
      breakdown,
      meta: {
        startDate: startStr,
        endDate: endStr,
        generatedAt: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Overview API error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
