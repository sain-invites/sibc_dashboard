/**
 * PostgreSQL API 연동 훅
 *
 * CSV 대신 서버 API를 호출하여 데이터를 가져옵니다.
 * DB 연결이 없는 경우 기존 CSV 로더로 폴백합니다.
 */

import { useState, useEffect, useCallback } from "react";

// ============================================
// 타입 정의
// ============================================

export interface KPI {
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

export interface TrendPoint {
  date: string;
  value: number;
}

export interface BreakdownItem {
  name: string;
  value: number;
  percentage?: number;
  completed?: number;
  total?: number;
}

export interface OverviewData {
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

export interface UserDirectoryData {
  users: Array<{
    userId: string;
    userName: string;
    eventCount: number;
    completedRoutines: number;
    totalRoutines: number;
    createdRoutines: number;
    completionRate: number;
    llmCost: number;
    lastActivity: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    startDate: string;
    endDate: string;
  };
}

export interface User360Data {
  summary: {
    userId: string;
    userName: string;
    age: number | null;
    biologicalAge: number | null;
    signatureType: string | null;
    signatureTypeName: string | null;
    signatureTypeDesc: string | null;
    signatureTypeExplainSummary: string | null;
    targetCalorie: number | null;
    bmr: number | null;
    tdee: number | null;
    healthStatusSummary: string | null;
    topRisks: Array<{
      name: string;
      score: number;
    }>;
    patientSummary: string | null;
    hasLifestyleGuide: boolean;
    lastUpdate: string | null;
    dataAvailability: {
      hasProfile: boolean;
      hasSignature: boolean;
      hasWeeklyPlan: boolean;
      hasChat: boolean;
      hasEvent: boolean;
    };
  };
  routine: {
    currentWeekPlan: {
      weekStartDate: string;
      weekEndDate: string;
      weeklyTheme: string | null;
      domain: string | null;
    } | null;
    weeklyGoals: Array<{
      domain: string;
      title: string;
      description: string | null;
      targetCount: number;
      completedCount: number;
      completionRatio: number;
    }>;
    dailyCompletionTrend: Array<{
      date: string;
      planned: number;
      completed: number;
      completionRate: number;
    }>;
    incompleteDomains: Array<{
      domain: string;
      incompleteCount: number;
      totalCount: number;
      percentage: number;
    }>;
    overallCompletionRate: number;
  };
  communication: {
    stats: {
      sentCount: number;
      pendingCount: number;
    };
    recentMessages: Array<{
      id: string;
      title: string;
      bodyPreview: string;
      bodyFull: string | null;
      createdAt: string;
      sent: boolean;
    }>;
    chatThreads: Array<{
      threadId: string;
      botType: string;
      askedTurns: number;
      summary: string | null;
      updatedAt: string;
      lastQuestion: string | null;
      lastAnswer: string | null;
      terminationReason: string | null;
      lastTurnAt: string | null;
      lastQuestionRaw: string | null;
      lastAnswerRaw: string | null;
      responseRaw: string | null;
      userIntent: string | null;
      incompleteIntent: string | null;
      turns: Array<{
        turnIndex: number;
        eventType: string | null;
        createdAt: string;
        questionText: string | null;
        answerText: string | null;
        questionRaw: string | null;
        answerRaw: string | null;
        responseRaw: string | null;
        terminationReason: string | null;
        userIntent: string | null;
        incompleteIntent: string | null;
      }>;
    }>;
  };
  operations: {
    totalLLMCalls: number;
    totalLLMCost: number;
    avgLatency: number;
    errorRate: number;
    llmUsageByCallType: Array<{
      callType: string;
      callCount: number;
      totalCost: number;
      avgLatency: number;
      errorCount: number;
    }>;
    recentFailures: Array<{
      id: string;
      status: string;
      error: string | null;
      startedAt: string;
      finishedAt: string | null;
      durationMs: number | null;
    }>;
    validationFailures: Array<{
      threadId: string;
      botType: string;
      reasonCode: string;
      reasonText: string;
      createdAt: string;
    }>;
  };
  meta: {
    userId: string;
    startDate: string;
    endDate: string;
    generatedAt: string;
  };
}

interface APIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ============================================
// 헬퍼 함수
// ============================================

const kstFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatDateParam(date: Date): string {
  return kstFormatter.format(date);
}

async function fetchAPI<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }
  return response.json();
}

// ============================================
// Overview API 훅
// ============================================

export function useOverviewAPI(startDate: Date, endDate: Date) {
  const [state, setState] = useState<APIState<OverviewData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const start = formatDateParam(startDate);
      const end = formatDateParam(endDate);
      const data = await fetchAPI<OverviewData>(
        `/api/overview?start=${start}&end=${end}`,
      );
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// ============================================
// Users API 훅
// ============================================

export function useUsersAPI(
  startDate: Date,
  endDate: Date,
  options?: {
    query?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
  },
) {
  const [state, setState] = useState<APIState<UserDirectoryData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const start = formatDateParam(startDate);
      const end = formatDateParam(endDate);
      const params = new URLSearchParams({
        start,
        end,
        ...(options?.query && { q: options.query }),
        ...(options?.page && { page: String(options.page) }),
        ...(options?.limit && { limit: String(options.limit) }),
        ...(options?.sort && { sort: options.sort }),
        ...(options?.order && { order: options.order }),
      });
      const data = await fetchAPI<UserDirectoryData>(`/api/users?${params}`);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [
    startDate,
    endDate,
    options?.query,
    options?.page,
    options?.limit,
    options?.sort,
    options?.order,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// ============================================
// User 360 API 훅
// ============================================

export function useUser360API(userId: string, startDate: Date, endDate: Date) {
  const [state, setState] = useState<APIState<User360Data>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!userId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const start = formatDateParam(startDate);
      const end = formatDateParam(endDate);
      const data = await fetchAPI<User360Data>(
        `/api/user360/${userId}?start=${start}&end=${end}`,
      );
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [userId, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// ============================================
// Health Check 훅
// ============================================

export function useHealthCheck(pollIntervalMs: number = 15000) {
  const [state, setState] = useState<{
    status: "ok" | "down";
    database: "connected" | "disconnected" | null;
    serverTime: string | null;
    lastSuccessAt: Date | null;
  }>({
    status: "down",
    database: null,
    serverTime: null,
    lastSuccessAt: null,
  });

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          throw new Error("Health check failed");
        }
        const data = await response.json();
        if (!isMounted) return;
        setState({
          status: "ok",
          database:
            data.database === "connected" ? "connected" : "disconnected",
          serverTime: data.serverTime ?? null,
          lastSuccessAt: new Date(),
        });
      } catch {
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          status: "down",
        }));
      }
    };

    checkHealth();
    const intervalId = window.setInterval(checkHealth, pollIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [pollIntervalMs]);

  return state;
}
