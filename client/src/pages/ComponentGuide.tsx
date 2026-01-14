import { useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowLeft,
  Book,
  Calculator,
  Database,
  FileText,
  Layout,
  Server,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const OVERVIEW_DOCS = [
  {
    id: "kpi-cards",
    title: "KPI Cards (핵심 지표)",
    component: "KPICard.tsx",
    description: "전체 사용자 현황 및 서비스 건강도 요약",
    api: "GET /api/overview",
    items: [
      {
        label: "총 사용자",
        table: "user_profiles.user_id",
        logic: "COUNT(DISTINCT user_id)",
      },
      {
        label: "DAU / WAU / MAU",
        table: "user_event_log.user_id, created_at",
        logic: "기간별 고유 사용자 수 집계",
      },
      {
        label: "루틴 수행률",
        table: "daily_routine_activities.completed_at, ymd",
        logic: "완료 건수 / 전체 건수 * 100",
      },
      {
        label: "LLM 비용",
        table: "llm_usage.cost_usd",
        logic: "기간 내 비용 합계",
      },
      {
        label: "LLM 에러율",
        table: "llm_usage.status, error_code",
        logic: "에러 호출 / 전체 호출 * 100",
      },
    ],
  },
  {
    id: "trend-charts",
    title: "Trend Charts (추이 분석)",
    component: "TrendChart.tsx",
    description: "기간별 주요 지표 추이 시각화",
    api: "GET /api/overview",
    items: [
      {
        label: "신규 사용자 추이",
        table: "user_event_log.created_at, user_id",
        logic: "최초 이벤트 날짜 기준 신규 사용자 수",
      },
      {
        label: "복귀 사용자 추이",
        table: "user_event_log",
        logic: "DAU - 신규 사용자",
      },
      {
        label: "루틴 완료/완료율",
        table: "daily_routine_activities.ymd, completed_at",
        logic: "COUNT 및 완료율 계산",
      },
      {
        label: "LLM 오류율/비용",
        table: "llm_usage.ts, cost_usd, status",
        logic: "오류율/호출당 비용 시계열",
      },
    ],
  },
  {
    id: "breakdown-charts",
    title: "Breakdown (상세 분석)",
    component: "BreakdownChart.tsx",
    description: "비용 및 수행률 다각도 상세 분석",
    api: "GET /api/overview",
    items: [
      {
        label: "Call Type별 비용",
        table: "llm_usage.call_type, cost_usd",
        logic: "call_type별 합계 Top 10",
      },
      {
        label: "Model별 비용",
        table: "llm_usage.model, cost_usd",
        logic: "model별 합계 Top 10",
      },
      {
        label: "도메인/우선순위/시간대별 수행율",
        table:
          "daily_routine_activities.domain, priority, activity_period, completed_at",
        logic: "completed / total * 100",
      },
      {
        label: "LLM 에러 Top 10",
        table: "llm_usage.error_message, error_code",
        logic: "에러 메시지/코드 빈도 집계",
      },
    ],
  },
  {
    id: "user-table",
    title: "UserTable (사용자 디렉토리)",
    component: "UserTable.tsx",
    description: "개별 사용자 활동·루틴·비용 요약",
    api: "GET /api/users",
    items: [
      {
        label: "이벤트 수",
        table: "user_event_log.seq, created_at",
        logic: "COUNT(seq)",
      },
      {
        label: "루틴 완료/생성",
        table: "daily_routine_activities.completed_at, activity_row_id",
        logic: "완료 건수 및 전체 건수",
      },
      {
        label: "완료율",
        table: "daily_routine_activities",
        logic: "completed / total * 100",
      },
      {
        label: "LLM 비용",
        table: "llm_usage.cost_usd",
        logic: "사용자별 비용 합계",
      },
      {
        label: "최근 활동",
        table:
          "user_event_log.created_at, llm_usage.ts, daily_routine_activities",
        logic: "최근 활동 시각 최대값",
      },
    ],
  },
  {
    id: "date-filter",
    title: "DateFilter (기간 필터)",
    component: "DateFilter.tsx",
    description: "데이터 조회 기간 범위 설정",
    api: "모든 API",
    items: [
      {
        label: "start/end",
        table: "전역 상태",
        logic: "API 요청 파라미터로 전달",
      },
    ],
  },
];

const USER360_DOCS = [
  {
    id: "user-summary",
    title: "User Summary (요약 탭)",
    component: "SummaryTab",
    description: "프로필, 건강 데이터, 보유 현황 요약",
    api: "GET /api/user360/:userId",
    tables: [
      "user_profiles",
      "user_signature_type",
      "target_calorie",
      "user_guardrail",
    ],
    details: [
      {
        field: "시그니처 타입",
        source: "user_signature_type",
        note: "created_at 최신값 기준",
      },
      {
        field: "Top Risks",
        source: "user_profiles.top_risks",
        note: "JSON 파싱 후 점수 내림차순",
      },
      {
        field: "라이프스타일 가이드",
        source: "user_guardrail.patient_summary",
        note: "최근 레코드 기준",
      },
    ],
  },
  {
    id: "user-routine",
    title: "Routine (루틴 탭)",
    component: "RoutineTab",
    description: "주간 플랜 및 일별 수행 현황 분석",
    api: "GET /api/user360/:userId",
    tables: [
      "weekly_routine_plan",
      "weekly_routine_goal",
      "daily_routine_activities",
    ],
    details: [
      {
        field: "주간 플랜",
        source: "weekly_routine_plan",
        note: "week_start_date 최신값 기준",
      },
      {
        field: "주간 목표",
        source: "weekly_routine_goal",
        note: "주간 플랜 ID 매핑",
      },
      {
        field: "일별 수행률",
        source: "daily_routine_activities.ymd",
        note: "planned/ completed 집계",
      },
    ],
  },
  {
    id: "user-communication",
    title: "Communication (커뮤니케이션 탭)",
    component: "CommunicationTab",
    description: "메시지 발송 이력 및 채팅 스레드 요약",
    api: "GET /api/user360/:userId",
    tables: ["send_messages", "chat_threads", "chat_threads_turns"],
    details: [
      {
        field: "발송 메시지",
        source: "send_messages",
        note: "sent로 발송/대기 구분",
      },
      {
        field: "채팅 스레드",
        source: "chat_threads",
        note: "user_id NULL이면 thread_id에서 추출",
      },
      {
        field: "대화 턴",
        source: "chat_threads_turns",
        note: "질문/응답 스냅샷 파싱",
      },
    ],
  },
  {
    id: "user-operations",
    title: "Operations (운영/비용 탭)",
    component: "OperationsTab",
    description: "LLM 사용량 및 시스템 처리/실패 로그",
    api: "GET /api/user360/:userId",
    tables: ["llm_usage", "processing_jobs", "user_state_validation_logs"],
    details: [
      {
        field: "LLM 사용량",
        source: "llm_usage",
        note: "call_type별 호출/비용/지연 집계",
      },
      {
        field: "처리 실패",
        source: "processing_jobs",
        note: "status = failed 최근 10건",
      },
      {
        field: "검증 실패",
        source: "user_state_validation_logs",
        note: "ymd 기간 필터 후 최신 10건",
      },
    ],
  },
];

const TABLES = [
  {
    name: "user_event_log",
    desc: "사용자 활동 로그",
    cols: "created_at, user_id, event_type",
  },
  {
    name: "llm_usage",
    desc: "LLM 호출 이력",
    cols: "ts, cost_usd, status, error_code, call_type, model, latency_ms",
  },
  {
    name: "daily_routine_activities",
    desc: "일별 루틴 수행 내역",
    cols: "ymd, completed_at, domain, priority, activity_period, user_id",
  },
  {
    name: "processing_jobs",
    desc: "백그라운드 작업 상태",
    cols: "status, started_at, finished_at, error",
  },
  {
    name: "user_profiles",
    desc: "사용자 프로필",
    cols: "user_id, user_name, age, biological_age, top_risks",
  },
  {
    name: "chat_threads",
    desc: "채팅 스레드",
    cols: "thread_id, bot_type, asked_turns, summary, user_id",
  },
];

export default function ComponentGuide() {
  const [activeTab, setActiveTab] = useState<"overview" | "user360">(
    "overview",
  );

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const docs = activeTab === "overview" ? OVERVIEW_DOCS : USER360_DOCS;

  return (
    <div className={cn("min-h-screen bg-background text-foreground")}>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
              <Book className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">컴포넌트 가이드</h1>
              <p className="text-xs text-muted-foreground">
                데이터 출처 및 계산식
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block space-y-6 sticky top-24 h-fit">
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-2">
              섹션
            </h2>
            <Button
              variant={activeTab === "overview" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 transition-all",
                activeTab === "overview" &&
                  "font-semibold border-l-2 border-primary rounded-l-none pl-3",
              )}
              onClick={() => setActiveTab("overview")}
            >
              <Activity className="w-4 h-4" />
              Service Overview
            </Button>
            <Button
              variant={activeTab === "user360" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 transition-all",
                activeTab === "user360" &&
                  "font-semibold border-l-2 border-primary rounded-l-none pl-3",
              )}
              onClick={() => setActiveTab("user360")}
            >
              <User className="w-4 h-4" />
              User 360
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-2">
              빠른 이동
            </h3>
            {docs.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-8 text-muted-foreground hover:text-foreground"
                onClick={() => scrollToSection(item.id)}
              >
                {item.title.split("(")[0]}
              </Button>
            ))}
          </div>
        </aside>

        <div className="space-y-8 pb-20">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {activeTab === "overview"
                ? "서비스 오버뷰 컴포넌트"
                : "User 360 컴포넌트"}
            </h2>
            <p className="text-muted-foreground">
              각 컴포넌트의 데이터 출처와 계산 로직을 설명합니다.
            </p>
          </div>

          {activeTab === "overview" ? (
            <div className="space-y-8">
              {OVERVIEW_DOCS.map((doc) => (
                <SectionCard key={doc.id} doc={doc} />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {USER360_DOCS.map((doc) => (
                <User360SectionCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}

          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              주요 테이블 요약
            </h3>
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[200px]">Table</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Key Columns
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TABLES.map((tableItem) => (
                      <TableRow key={tableItem.name}>
                        <TableCell className="font-mono text-sm text-primary">
                          {tableItem.name}
                        </TableCell>
                        <TableCell>{tableItem.desc}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">
                          {tableItem.cols}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionCard({ doc }: { doc: (typeof OVERVIEW_DOCS)[number] }) {
  return (
    <Card id={doc.id} className="scroll-mt-20 border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layout className="w-5 h-5 text-muted-foreground" />
              {doc.title}
            </CardTitle>
            <CardDescription>{doc.description}</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {doc.component}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ApiBadge method="GET" path={doc.api} />

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="logic" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calculator className="w-4 h-4 text-primary" />
                데이터 로직 및 계산식
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="rounded-md border border-border bg-muted/20">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/20 z-10">
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="w-[180px]">지표</TableHead>
                      <TableHead className="w-[200px]">Table/Column</TableHead>
                      <TableHead>Logic / Formula</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doc.items.map((item) => (
                      <TableRow
                        key={item.label}
                        className="hover:bg-transparent border-border"
                      >
                        <TableCell className="font-medium">
                          {item.label}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.table}
                        </TableCell>
                        <TableCell className="text-sm">{item.logic}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function User360SectionCard({ doc }: { doc: (typeof USER360_DOCS)[number] }) {
  return (
    <Card id={doc.id} className="scroll-mt-20 border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layout className="w-5 h-5 text-muted-foreground" />
              {doc.title}
            </CardTitle>
            <CardDescription>{doc.description}</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {doc.component}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ApiBadge method="GET" path={doc.api} />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Server className="w-4 h-4 text-primary" />
            관련 테이블
          </div>
          <div className="flex flex-wrap gap-2">
            {doc.tables.map((tableName) => (
              <Badge key={tableName} variant="secondary" className="text-xs">
                {tableName}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <FileText className="w-4 h-4 text-primary" />
            상세 설명
          </div>
          <ul className="space-y-2">
            {doc.details.map((detail) => (
              <li
                key={detail.field}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm p-2 rounded bg-muted/20"
              >
                <span className="font-semibold min-w-[120px]">
                  {detail.field}
                </span>
                <span className="hidden sm:inline text-muted-foreground">
                  •
                </span>
                <span className="font-mono text-xs text-primary/80 min-w-[140px]">
                  {detail.source}
                </span>
                <span className="text-muted-foreground text-xs sm:ml-auto">
                  {detail.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function ApiBadge({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border w-fit">
      <Badge className="bg-blue-600 hover:bg-blue-700 border-0">{method}</Badge>
      <code className="text-xs font-mono">{path}</code>
    </div>
  );
}
