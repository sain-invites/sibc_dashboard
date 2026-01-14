/**
 * User Directory API
 *
 * 사용자 목록 조회, 검색, 페이지네이션 지원
 *
 * 리뷰 반영 사항:
 * - event_count: COUNT(uel.seq) 사용 (COUNT(DISTINCT user_id) 아님)
 * - daily_routine_activities: ymd 기반 필터링
 * - llm_usage: ts 컬럼 사용
 */

import { Router, Request, Response } from "express";
import { queryMany, queryOne } from "../db.js";
import {
  DateParamSchema,
  PaginationParamsSchema,
  SearchQuerySchema,
  SortParamsSchema,
  UserIdSchema,
} from "../lib/validators.js";
import type { UserDirectoryResponse } from "../../shared/apiTypes.js";

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

// ============================================
// 타입 정의
// ============================================

interface UserRow {
  user_id: string;
  user_name: string;
  event_count: number;
  completed_routines: number;
  total_routines: number;
  created_routines: number;
  llm_cost: string | number;
  last_activity: Date | string | null;
}

// ============================================
// SQL 쿼리 (리뷰 반영)
// ============================================

const SQL = {
  // 사용자 목록
  userList: `
    WITH
    events AS (
      SELECT
        uel.user_id::text AS user_id,
        COUNT(uel.seq)::int AS event_count,
        MAX(uel.created_at)::timestamptz AS last_activity
      FROM user_event_log uel
      WHERE (uel.created_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
      GROUP BY uel.user_id::text
    ),
    routines AS (
      SELECT
        dra.user_id::text AS user_id,
        SUM(CASE WHEN dra.completed_at IS NOT NULL THEN 1 ELSE 0 END)::int AS completed_routines,
        COUNT(dra.activity_row_id)::int AS total_routines,
        MAX(COALESCE(dra.completed_at, to_date(dra.ymd::text, 'YYYYMMDD')::timestamptz)) AS last_activity
      FROM daily_routine_activities dra
      WHERE to_date(dra.ymd::text, 'YYYYMMDD') BETWEEN $1::date AND $2::date
      GROUP BY dra.user_id::text
    ),
    llm AS (
      SELECT
        lu.user_id::text AS user_id,
        COALESCE(SUM(lu.cost_usd), 0)::numeric AS llm_cost,
        MAX(lu.ts)::timestamptz AS last_activity
      FROM llm_usage lu
      WHERE (lu.ts AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
      GROUP BY lu.user_id::text
    )
    SELECT
      up.user_id,
      up.user_name,
      COALESCE(e.event_count, 0) AS event_count,
      COALESCE(r.completed_routines, 0) AS completed_routines,
      COALESCE(r.total_routines, 0) AS total_routines,
      COALESCE(r.total_routines, 0) AS created_routines,
      COALESCE(l.llm_cost, 0)::numeric AS llm_cost,
      (
        SELECT MAX(v)
        FROM (VALUES (e.last_activity), (r.last_activity), (l.last_activity)) AS t(v)
      ) AS last_activity
    FROM user_profiles up
    LEFT JOIN events e ON e.user_id = up.user_id::text
    LEFT JOIN routines r ON r.user_id = up.user_id::text
    LEFT JOIN llm l ON l.user_id = up.user_id::text
    WHERE ($3 = '' OR up.user_name ILIKE $3 OR up.user_id::text ILIKE $3)
  `,

  // 총 사용자 수
  userCount: `
    SELECT COUNT(*)::int as count
    FROM user_profiles
    WHERE ($1 = '' OR user_name ILIKE $1 OR user_id::text ILIKE $1)
  `,
};

const SORT_COLUMNS = {
  userName: "NULLIF(TRIM(up.user_name), '') COLLATE \"C\"",
  eventCount: "COALESCE(e.event_count, 0)",
  completedRoutines: "COALESCE(r.completed_routines, 0)",
  createdRoutines: "COALESCE(r.total_routines, 0)",
  completionRate: `CASE
    WHEN COALESCE(r.total_routines, 0) > 0
      THEN COALESCE(r.completed_routines, 0)::numeric / COALESCE(r.total_routines, 0)
    ELSE 0
  END`,
  llmCost: "COALESCE(l.llm_cost, 0)",
  lastActivity: "last_activity",
} as const;

type SortKey = keyof typeof SORT_COLUMNS;

function buildOrderBy(sortKeyParam: unknown, sortOrderParam: unknown): string {
  const sortKey =
    typeof sortKeyParam === "string" &&
    Object.prototype.hasOwnProperty.call(SORT_COLUMNS, sortKeyParam)
      ? (sortKeyParam as SortKey)
      : "lastActivity";
  const sortOrder =
    typeof sortOrderParam === "string" && sortOrderParam.toLowerCase() === "asc"
      ? "ASC"
      : "DESC";
  const primary = `${SORT_COLUMNS[sortKey]} ${sortOrder} NULLS LAST`;
  return `${primary}, NULLIF(TRIM(up.user_name), '') COLLATE "C" ASC NULLS LAST, last_activity DESC NULLS LAST`;
}

// ============================================
// API 엔드포인트
// ============================================

router.get("/", async (req: Request, res: Response) => {
  try {
    const { start, end, q, page, limit, sort, order } = req.query;

    const endValidation = DateParamSchema.safeParse(end);
    if (!endValidation.success) {
      res.status(400).json({
        error: "Invalid parameter",
        message: endValidation.error.issues[0].message,
        field: "end",
      });
      return;
    }

    const startValidation = DateParamSchema.safeParse(start);
    if (start && !startValidation.success) {
      res.status(400).json({
        error: "Invalid parameter",
        message: startValidation.error.issues[0].message,
        field: "start",
      });
      return;
    }

    const paginationValidation = PaginationParamsSchema.safeParse({
      page,
      limit,
    });
    if (!paginationValidation.success) {
      res.status(400).json({
        error: "Invalid parameter",
        message: paginationValidation.error.issues[0].message,
        field: paginationValidation.error.issues[0].path.join("."),
      });
      return;
    }

    const searchValidation = SearchQuerySchema.safeParse(q);
    if (q && !searchValidation.success) {
      res.status(400).json({
        error: "Invalid parameter",
        message: searchValidation.error.issues[0].message,
        field: "q",
      });
      return;
    }

    const sortValidation = SortParamsSchema.safeParse({ sort, order });
    if ((sort || order) && !sortValidation.success) {
      res.status(400).json({
        error: "Invalid parameter",
        message: sortValidation.error.issues[0].message,
        field: sortValidation.error.issues[0].path.join("."),
      });
      return;
    }

    const endStr = parseDateParam(end) ?? formatDateKST(new Date());
    const endDate = dateFromKstString(endStr);
    const startStr =
      parseDateParam(start) ??
      formatDateKST(new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000));

    const pageNum = paginationValidation.data.page;
    const limitNum = paginationValidation.data.limit;
    const offset = (pageNum - 1) * limitNum;

    const searchQuery = searchValidation.data
      ? `%${searchValidation.data}%`
      : "";
    const orderBy = buildOrderBy(
      sortValidation.data?.sort,
      sortValidation.data?.order,
    );
    const userListQuery = `${SQL.userList} ORDER BY ${orderBy} LIMIT $4 OFFSET $5`;

    // 병렬 쿼리 실행
    const [usersResult, countResult] = await Promise.all([
      queryMany<UserRow>(userListQuery, [
        startStr,
        endStr,
        searchQuery,
        limitNum,
        offset,
      ]),
      queryOne<{ count: number }>(SQL.userCount, [searchQuery]),
    ]);

    const total = countResult?.count || 0;

    const response: UserDirectoryResponse = {
      users: usersResult.map((u) => ({
        userId: u.user_id,
        userName: u.user_name || "(이름 없음)",
        eventCount: u.event_count || 0,
        completedRoutines: u.completed_routines || 0,
        totalRoutines: u.total_routines || 0,
        createdRoutines: u.created_routines || 0,
        completionRate:
          u.total_routines > 0
            ? Math.round((u.completed_routines / u.total_routines) * 1000) / 10
            : 0,
        llmCost: Number(u.llm_cost) || 0,
        lastActivity: u.last_activity
          ? new Date(u.last_activity).toISOString()
          : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      meta: {
        startDate: startStr,
        endDate: endStr,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Users API error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
