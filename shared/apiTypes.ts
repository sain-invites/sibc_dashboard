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

export interface OverviewResponse {
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

export interface UserDirectoryResponse {
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

export interface User360Response {
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
