/**
 * User 360 API
 *
 * 특정 사용자의 상세 정보 (요약, 루틴, 커뮤니케이션, 운영/비용)
 *
 * 리뷰 반영 사항:
 * - chat_threads: user_id가 NULL인 경우 thread_id에서 추출
 * - llm_usage: ts 컬럼 사용
 * - daily_routine_activities: ymd 기반 필터링
 * - send_messages: msg_id, transmit_title, transmit_msg 컬럼 사용
 */

import { Router, Request, Response } from "express";
import { queryMany, queryOne } from "../db.js";

const router = Router();

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

function parseTopRisks(value: unknown): Array<{ name: string; score: number }> {
  if (!value) return [];

  const normalizeEntry = (entry: unknown) => {
    if (!entry) return null;
    if (Array.isArray(entry)) {
      const [name, score] = entry;
      if (typeof name !== "string") return null;
      return { name, score: Number(score) || 0 };
    }
    if (typeof entry === "object") {
      const obj = entry as Record<string, unknown>;
      const name =
        (typeof obj.disease_name === "string" && obj.disease_name) ||
        (typeof obj.name === "string" && obj.name) ||
        (typeof obj.disease_id === "string" && obj.disease_id) ||
        null;
      if (!name) return null;
      const score = Number(obj.score ?? obj.rank ?? obj.value) || 0;
      return { name, score };
    }
    return null;
  };

  if (Array.isArray(value)) {
    return value.map(normalizeEntry).filter(Boolean) as Array<{
      name: string;
      score: number;
    }>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeEntry).filter(Boolean) as Array<{
          name: string;
          score: number;
        }>;
      }
    } catch {
      return [];
    }
  }

  return [];
}

function parseCalorieBasis(value: unknown): {
  bmr: number | null;
  tdee: number | null;
} {
  if (!value) return { bmr: null, tdee: null };

  const normalize = (input: unknown) => {
    if (!input) return null;
    const obj = input as Record<string, unknown>;
    const bmr = Number(obj.bmr ?? obj.BMR);
    const tdee = Number(obj.tdee ?? obj.base_calorie ?? obj.baseCalorie);
    return {
      bmr: Number.isFinite(bmr) ? bmr : null,
      tdee: Number.isFinite(tdee) ? tdee : null,
    };
  };

  if (typeof value === "string") {
    try {
      return normalize(JSON.parse(value)) ?? { bmr: null, tdee: null };
    } catch {
      return { bmr: null, tdee: null };
    }
  }

  return normalize(value) ?? { bmr: null, tdee: null };
}

function parseJsonText(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractQuestionText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const parsed = parseJsonText(value);
    if (!parsed) return value;
    const question =
      (typeof parsed.question === "string" && parsed.question) ||
      (typeof parsed.content === "string" && parsed.content) ||
      (typeof parsed.text === "string" && parsed.text) ||
      null;
    return question;
  }
  return null;
}

function extractAnswerText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const parsed = parseJsonText(value);
    if (!parsed) return value;
    const text =
      (typeof parsed.text === "string" && parsed.text) ||
      (typeof parsed.answer === "string" && parsed.answer) ||
      null;
    return text;
  }
  return null;
}

// ============================================
// 타입 정의
// ============================================

interface User360Response {
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

// ============================================
// SQL 쿼리 (리뷰 반영)
// ============================================

const SQL = {
  // 사용자 기본 정보
  userSummary: `
    SELECT 
      up.user_id,
      up.user_name,
      up.age,
      up.biological_age,
      up.updated_at as last_update,
      up.top_risks as top_risks,
      (SELECT signature_type FROM user_signature_type 
       WHERE user_id::text = up.user_id::text 
       ORDER BY to_date(created_at::text, 'YYYYMMDD') DESC LIMIT 1) as signature_type,
      (SELECT signature_type_name FROM user_signature_type 
       WHERE user_id::text = up.user_id::text 
       ORDER BY to_date(created_at::text, 'YYYYMMDD') DESC LIMIT 1) as signature_type_name,
      (SELECT signature_type_desc FROM user_signature_type 
       WHERE user_id::text = up.user_id::text 
       ORDER BY to_date(created_at::text, 'YYYYMMDD') DESC LIMIT 1) as signature_type_desc,
      (SELECT signature_type_explain_summary FROM user_signature_type 
       WHERE user_id::text = up.user_id::text 
       ORDER BY to_date(created_at::text, 'YYYYMMDD') DESC LIMIT 1) as signature_type_explain_summary,
      (SELECT target_daily_calorie FROM target_calorie 
       WHERE user_id::text = up.user_id::text 
       ORDER BY updated_at DESC NULLS LAST LIMIT 1) as target_calorie,
      (SELECT calorie_calculation_basis FROM target_calorie 
       WHERE user_id::text = up.user_id::text 
       ORDER BY updated_at DESC NULLS LAST LIMIT 1) as calorie_basis,
      (SELECT health_status_summary FROM target_calorie 
       WHERE user_id::text = up.user_id::text 
       ORDER BY updated_at DESC NULLS LAST LIMIT 1) as health_status_summary,
      ug.patient_summary,
      ug.lifestyle_guide_json IS NOT NULL as has_lifestyle_guide
    FROM user_profiles up
    LEFT JOIN LATERAL (
      SELECT *
      FROM user_guardrail ug
      WHERE ug.user_id::text = up.user_id::text
      ORDER BY ug.updated_at DESC NULLS LAST
      LIMIT 1
    ) ug ON true
    WHERE up.user_id::text = $1
  `,

  // 데이터 존재 여부 확인
  dataAvailability: `
    SELECT
      EXISTS(SELECT 1 FROM user_profiles WHERE user_id::text = $1) as has_profile,
      EXISTS(SELECT 1 FROM user_signature_type WHERE user_id::text = $1) as has_signature,
      EXISTS(SELECT 1 FROM weekly_routine_plan WHERE user_id::text = $1) as has_weekly_plan,
      EXISTS(SELECT 1 FROM chat_threads WHERE user_id::text = $1 OR split_part(thread_id, ':', 2) = $1::text) as has_chat,
      EXISTS(SELECT 1 FROM user_event_log WHERE user_id::text = $1) as has_event
  `,

  // 현재 주간 플랜
  currentWeekPlan: `
    SELECT 
      id,
      week_start_date,
      week_end_date,
      weekly_theme,
      domain
    FROM weekly_routine_plan
    WHERE user_id::text = $1
    ORDER BY week_start_date DESC
    LIMIT 1
  `,

  // 주간 목표
  weeklyGoals: `
    SELECT 
      domain,
      title,
      description,
      weekly_target_count,
      weekly_completed_count,
      completion_ratio
    FROM weekly_routine_goal
    WHERE weekly_routine_plan_id = $1::bigint
    ORDER BY domain
  `,

  // 일별 완료율 추이 (ymd 기반 - 리뷰 반영)
  dailyCompletionTrend: `
    SELECT 
      to_date(ymd::text, 'YYYYMMDD') as date,
      COUNT(*)::int as planned,
      SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)::int as completed
    FROM daily_routine_activities
    WHERE user_id::text = $1
      AND to_date(ymd::text, 'YYYYMMDD') BETWEEN $2::date AND $3::date
    GROUP BY ymd
    ORDER BY date
  `,

  // 미완료 도메인 분석 (ymd 기반 - 리뷰 반영)
  incompleteDomains: `
    SELECT 
      domain,
      SUM(CASE WHEN completed_at IS NULL THEN 1 ELSE 0 END)::int as incomplete_count,
      COUNT(*)::int as total_count
    FROM daily_routine_activities
    WHERE user_id::text = $1
      AND to_date(ymd::text, 'YYYYMMDD') BETWEEN $2::date AND $3::date
    GROUP BY domain
    HAVING SUM(CASE WHEN completed_at IS NULL THEN 1 ELSE 0 END) > 0
    ORDER BY incomplete_count DESC
  `,

  // 최근 메시지 (컬럼명 수정 - 리뷰 반영)
  recentMessages: `
    SELECT 
      msg_id as id,
      transmit_title as title,
      LEFT(transmit_msg, 100) as body_preview,
      transmit_msg as body_full,
      created_at,
      sent
    FROM send_messages
    WHERE user_id::text = $1
    ORDER BY created_at DESC
    LIMIT 10
  `,

  messageStats: `
    SELECT
      SUM(CASE WHEN sent THEN 1 ELSE 0 END)::int AS sent_count,
      SUM(CASE WHEN sent THEN 0 ELSE 1 END)::int AS pending_count
    FROM send_messages
    WHERE user_id::text = $1
      AND (created_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $2::date AND $3::date
  `,

  threadTurns: `
    SELECT
      thread_id,
      turn_index,
      event_type,
      question_snapshot::text as question_snapshot,
      submitted_answer::text as submitted_answer,
      response::text as response,
      user_intent,
      incomplete_intent,
      termination_reason,
      created_at
    FROM chat_threads_turns
    WHERE thread_id = ANY(string_to_array($1, ','))
    ORDER BY thread_id, created_at ASC
  `,

  // 채팅 스레드 (user_id 보정 - 리뷰 반영)
  chatThreads: `
    SELECT 
      thread_id,
      bot_type,
      asked_turns,
      summary,
      updated_at
    FROM chat_threads
    WHERE user_id::text = $1 
       OR (user_id IS NULL AND split_part(thread_id, ':', 2) = $1::text)
    ORDER BY updated_at DESC
    LIMIT 10
  `,

  // LLM 사용량 by call_type (ts 컬럼 - 리뷰 반영)
  llmUsageByType: `
    SELECT 
      call_type,
      COUNT(*)::int as call_count,
      SUM(cost_usd)::numeric as total_cost,
      AVG(latency_ms)::int as avg_latency,
      SUM(CASE WHEN status = 'error' OR error_code IS NOT NULL THEN 1 ELSE 0 END)::int as error_count
    FROM llm_usage
    WHERE user_id::text = $1
      AND (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $2::date AND $3::date
    GROUP BY call_type
    ORDER BY total_cost DESC
  `,

  // LLM 전체 통계 (ts 컬럼 - 리뷰 반영)
  llmTotalStats: `
    SELECT 
      COUNT(*)::int as total_calls,
      COALESCE(SUM(cost_usd), 0)::numeric as total_cost,
      COALESCE(AVG(latency_ms), 0)::int as avg_latency,
      SUM(CASE WHEN status = 'error' OR error_code IS NOT NULL THEN 1 ELSE 0 END)::int as error_count
    FROM llm_usage
    WHERE user_id::text = $1
      AND (ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $2::date AND $3::date
  `,

  // 최근 실패 잡
  recentFailures: `
    SELECT 
      id,
      status,
      error,
      started_at,
      finished_at,
      EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000 as duration_ms
    FROM processing_jobs
    WHERE user_id::text = $1
      AND status = 'failed'
      AND (started_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $2::date AND $3::date
    ORDER BY started_at DESC
    LIMIT 10
  `,

  // 검증 실패 로그
  validationFailures: `
    SELECT 
      thread_id,
      bot_type,
      reason_code,
      reason_text,
      created_at
    FROM user_state_validation_logs
    WHERE user_id::text = $1
      AND to_date(ymd::text, 'YYYYMMDD') BETWEEN $2::date AND $3::date
    ORDER BY created_at DESC
    LIMIT 10
  `,
};

// ============================================
// API 엔드포인트
// ============================================

router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { start, end } = req.query;

    // 기본값: 최근 30일
    const endStr = parseDateParam(end) ?? formatDateKST(new Date());
    const endDate = dateFromKstString(endStr);
    const startStr =
      parseDateParam(start) ??
      formatDateKST(new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000));

    // 병렬 쿼리 실행
    const [
      summaryResult,
      availabilityResult,
      weekPlanResult,
      dailyTrendResult,
      incompleteDomainsResult,
      messagesResult,
      messageStatsResult,
      threadsResult,
      llmByTypeResult,
      llmTotalResult,
      failuresResult,
      validationResult,
    ] = await Promise.all([
      queryOne<{
        user_id: string;
        user_name: string;
        age: number | null;
        biological_age: number | null;
        last_update: Date | null;
        top_risks: unknown;
        signature_type: string | null;
        signature_type_name: string | null;
        signature_type_desc: string | null;
        signature_type_explain_summary: string | null;
        target_calorie: number | null;
        calorie_basis: unknown;
        health_status_summary: string | null;
        patient_summary: string | null;
        has_lifestyle_guide: boolean;
      }>(SQL.userSummary, [userId]),
      queryOne<{
        has_profile: boolean;
        has_signature: boolean;
        has_weekly_plan: boolean;
        has_chat: boolean;
        has_event: boolean;
      }>(SQL.dataAvailability, [userId]),
      queryOne<{
        id: string;
        week_start_date: string;
        week_end_date: string;
        weekly_theme: string | null;
        domain: string | null;
      }>(SQL.currentWeekPlan, [userId]),
      queryMany<{
        date: Date;
        planned: number;
        completed: number;
      }>(SQL.dailyCompletionTrend, [userId, startStr, endStr]),
      queryMany<{
        domain: string;
        incomplete_count: number;
        total_count: number;
      }>(SQL.incompleteDomains, [userId, startStr, endStr]),
      queryMany<{
        id: string;
        title: string;
        body_preview: string;
        body_full: string | null;
        created_at: Date;
        sent: boolean;
      }>(SQL.recentMessages, [userId]),
      queryOne<{
        sent_count: number | null;
        pending_count: number | null;
      }>(SQL.messageStats, [userId, startStr, endStr]),
      queryMany<{
        thread_id: string;
        bot_type: string;
        asked_turns: number;
        summary: string | null;
        updated_at: Date;
      }>(SQL.chatThreads, [userId]),
      queryMany<{
        call_type: string;
        call_count: number;
        total_cost: number;
        avg_latency: number;
        error_count: number;
      }>(SQL.llmUsageByType, [userId, startStr, endStr]),
      queryOne<{
        total_calls: number;
        total_cost: number;
        avg_latency: number;
        error_count: number;
      }>(SQL.llmTotalStats, [userId, startStr, endStr]),
      queryMany<{
        id: string;
        status: string;
        error: string | null;
        started_at: Date;
        finished_at: Date | null;
        duration_ms: number | null;
      }>(SQL.recentFailures, [userId, startStr, endStr]),
      queryMany<{
        thread_id: string;
        bot_type: string;
        reason_code: string;
        reason_text: string;
        created_at: Date;
      }>(SQL.validationFailures, [userId, startStr, endStr]),
    ]);

    // 주간 목표 조회 (주간 플랜이 있는 경우)
    let weeklyGoalsResult: Array<{
      domain: string;
      title: string;
      description: string | null;
      weekly_target_count: number;
      weekly_completed_count: number;
      completion_ratio: number;
    }> = [];

    if (weekPlanResult?.id) {
      weeklyGoalsResult = await queryMany(SQL.weeklyGoals, [weekPlanResult.id]);
    }

    // 전체 완료율 계산
    const totalPlanned = dailyTrendResult.reduce(
      (sum, d) => sum + d.planned,
      0,
    );
    const totalCompleted = dailyTrendResult.reduce(
      (sum, d) => sum + d.completed,
      0,
    );
    const overallCompletionRate =
      totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;
    const calorieBasis = parseCalorieBasis(summaryResult?.calorie_basis);
    const topRisks = parseTopRisks(summaryResult?.top_risks);

    const threadIds = threadsResult.map((thread) => thread.thread_id);
    const threadIdsParam = threadIds.join(",");
    const threadTurnResults =
      threadIdsParam.length > 0
        ? await queryMany<{
            thread_id: string;
            turn_index: number;
            event_type: string | null;
            question_snapshot: string | null;
            submitted_answer: string | null;
            response: string | null;
            user_intent: string | null;
            incomplete_intent: string | null;
            termination_reason: string | null;
            created_at: Date;
          }>(SQL.threadTurns, [threadIdsParam])
        : [];
    const threadTurnsMap = new Map<
      string,
      Array<(typeof threadTurnResults)[number]>
    >();

    threadTurnResults.forEach((row) => {
      const existing = threadTurnsMap.get(row.thread_id) ?? [];
      existing.push(row);
      threadTurnsMap.set(row.thread_id, existing);
    });

    // 응답 구성
    const response: User360Response = {
      summary: {
        userId: summaryResult?.user_id || userId,
        userName: summaryResult?.user_name || "(알 수 없음)",
        age: summaryResult?.age || null,
        biologicalAge: summaryResult?.biological_age || null,
        signatureType: summaryResult?.signature_type || null,
        signatureTypeName: summaryResult?.signature_type_name || null,
        signatureTypeDesc: summaryResult?.signature_type_desc || null,
        signatureTypeExplainSummary:
          summaryResult?.signature_type_explain_summary || null,
        targetCalorie: summaryResult?.target_calorie || null,
        bmr: calorieBasis.bmr,
        tdee: calorieBasis.tdee,
        healthStatusSummary: summaryResult?.health_status_summary || null,
        topRisks,
        patientSummary: summaryResult?.patient_summary || null,
        hasLifestyleGuide: summaryResult?.has_lifestyle_guide || false,
        lastUpdate: summaryResult?.last_update
          ? new Date(summaryResult.last_update).toISOString()
          : null,
        dataAvailability: {
          hasProfile: availabilityResult?.has_profile || false,
          hasSignature: availabilityResult?.has_signature || false,
          hasWeeklyPlan: availabilityResult?.has_weekly_plan || false,
          hasChat: availabilityResult?.has_chat || false,
          hasEvent: availabilityResult?.has_event || false,
        },
      },
      routine: {
        currentWeekPlan: weekPlanResult
          ? {
              weekStartDate: weekPlanResult.week_start_date,
              weekEndDate: weekPlanResult.week_end_date,
              weeklyTheme: weekPlanResult.weekly_theme,
              domain: weekPlanResult.domain,
            }
          : null,
        weeklyGoals: weeklyGoalsResult.map((g) => ({
          domain: g.domain || "unknown",
          title: g.title || "",
          description: g.description,
          targetCount: g.weekly_target_count || 0,
          completedCount: g.weekly_completed_count || 0,
          completionRatio: Number(g.completion_ratio) || 0,
        })),
        dailyCompletionTrend: dailyTrendResult.map((d) => ({
          date: new Date(d.date).toISOString().split("T")[0],
          planned: d.planned,
          completed: d.completed,
          completionRate: d.planned > 0 ? (d.completed / d.planned) * 100 : 0,
        })),
        incompleteDomains: incompleteDomainsResult.map((d) => ({
          domain: d.domain || "unknown",
          incompleteCount: d.incomplete_count,
          totalCount: d.total_count,
          percentage:
            d.total_count > 0 ? (d.incomplete_count / d.total_count) * 100 : 0,
        })),
        overallCompletionRate,
      },
      communication: {
        stats: {
          sentCount: messageStatsResult?.sent_count ?? 0,
          pendingCount: messageStatsResult?.pending_count ?? 0,
        },
        recentMessages: messagesResult.map((m) => ({
          id: m.id,
          title: m.title || "(제목 없음)",
          bodyPreview: m.body_preview || "",
          bodyFull: m.body_full || null,
          createdAt: new Date(m.created_at).toISOString(),
          sent: m.sent,
        })),
        chatThreads: threadsResult.map((t) => {
          const turns = threadTurnsMap.get(t.thread_id) ?? [];
          const lastTurn = turns.at(-1) ?? null;
          const lastAnsweredTurn = [...turns]
            .reverse()
            .find((turn) => extractAnswerText(turn.submitted_answer));
          const summaryTurn = lastAnsweredTurn ?? lastTurn;

          return {
            threadId: t.thread_id,
            botType: t.bot_type || "unknown",
            askedTurns: t.asked_turns || 0,
            summary: t.summary,
            updatedAt: new Date(t.updated_at).toISOString(),
            lastQuestion: extractQuestionText(summaryTurn?.question_snapshot),
            lastAnswer: extractAnswerText(summaryTurn?.submitted_answer),
            terminationReason: lastTurn?.termination_reason || null,
            lastTurnAt: lastTurn?.created_at
              ? new Date(lastTurn.created_at).toISOString()
              : null,
            lastQuestionRaw: summaryTurn?.question_snapshot || null,
            lastAnswerRaw: summaryTurn?.submitted_answer || null,
            responseRaw: summaryTurn?.response || null,
            userIntent: lastTurn?.user_intent || null,
            incompleteIntent: lastTurn?.incomplete_intent || null,
            turns: turns.map((turn) => ({
              turnIndex: turn.turn_index,
              eventType: turn.event_type,
              createdAt: new Date(turn.created_at).toISOString(),
              questionText: extractQuestionText(turn.question_snapshot),
              answerText: extractAnswerText(turn.submitted_answer),
              questionRaw: turn.question_snapshot,
              answerRaw: turn.submitted_answer,
              responseRaw: turn.response,
              terminationReason: turn.termination_reason || null,
              userIntent: turn.user_intent || null,
              incompleteIntent: turn.incomplete_intent || null,
            })),
          };
        }),
      },

      operations: {
        totalLLMCalls: llmTotalResult?.total_calls || 0,
        totalLLMCost: Number(llmTotalResult?.total_cost) || 0,
        avgLatency: llmTotalResult?.avg_latency || 0,
        errorRate: llmTotalResult?.total_calls
          ? ((llmTotalResult.error_count || 0) / llmTotalResult.total_calls) *
            100
          : 0,
        llmUsageByCallType: llmByTypeResult.map((l) => ({
          callType: l.call_type || "unknown",
          callCount: l.call_count,
          totalCost: Number(l.total_cost),
          avgLatency: l.avg_latency,
          errorCount: l.error_count,
        })),
        recentFailures: failuresResult.map((f) => ({
          id: f.id,
          status: f.status,
          error: f.error,
          startedAt: new Date(f.started_at).toISOString(),
          finishedAt: f.finished_at
            ? new Date(f.finished_at).toISOString()
            : null,
          durationMs: f.duration_ms ? Math.round(f.duration_ms) : null,
        })),
        validationFailures: validationResult.map((v) => ({
          threadId: v.thread_id,
          botType: v.bot_type || "unknown",
          reasonCode: v.reason_code || "",
          reasonText: v.reason_text || "",
          createdAt: new Date(v.created_at).toISOString(),
        })),
      },
      meta: {
        userId,
        startDate: startStr,
        endDate: endStr,
        generatedAt: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("User360 API error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
