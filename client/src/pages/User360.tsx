/**
 * User 360 대시보드 페이지 (API 기반)
 *
 * 특정 사용자의 상세 정보를 4개 탭으로 구성:
 * - 요약: 기본 정보, 데이터 보유 현황
 * - 루틴: 주간 플랜, 일별 수행율, 미수행 영역
 * - 커뮤니케이션: 메시지, 채팅 스레드
 * - 운영/비용: LLM 사용량, 처리 실패, 검증 실패
 */

import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useHealthCheck,
  useUser360API,
  useUsersAPI,
  type User360Data,
} from "@/hooks/useAPI";
import {
  formatCurrencyUSD,
  formatDateTimeKST,
  formatInteger,
  formatMs,
  formatPercent,
} from "@/lib/formatters";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateFilter } from "@/components/DateFilter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { TooltipProps as RechartsTooltipProps } from "recharts";

import { format, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ArrowLeft,
  Search,
  User,
  Calendar,
  MessageSquare,
  TrendingUp,
  Target,
  Check,
  X,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
  ChevronDown,
  Database,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatDateOnly = (value: string | null | undefined) => {
  const text = formatDateTimeKST(value, false);
  if (text === "-") return "-";
  return text.split(" ")[0] ?? "-";
};

const formatDateTimeMinute = (value: string | null | undefined) =>
  formatDateTimeKST(value, false);

const formatMonthDay = (value: string | null | undefined) => {
  const text = formatDateTimeKST(value, false);
  if (text === "-") return "-";
  const datePart = text.split(" ")[0] ?? "";
  return datePart.length >= 10
    ? `${datePart.slice(5, 7)}/${datePart.slice(8, 10)}`
    : datePart;
};

// ============================================
// 요약 탭
// ============================================
function SummaryTab({ data }: { data: User360Data }) {
  const lastUpdateText = formatDateOnly(data.summary.lastUpdate);

  const availability = data.summary.dataAvailability;
  const topRisks = [...(data.summary.topRisks ?? [])].sort(
    (a, b) => b.score - a.score,
  );
  const signatureTitle =
    data.summary.signatureTypeName || data.summary.signatureType || "-";
  const signatureDetail =
    data.summary.signatureTypeExplainSummary || data.summary.signatureTypeDesc;
  const bmrText =
    data.summary.bmr != null ? `${formatInteger(data.summary.bmr)} kcal` : "-";
  const tdeeText =
    data.summary.tdee != null
      ? `${formatInteger(data.summary.tdee)} kcal`
      : "-";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">사용자 ID</p>
                <p className="text-sm font-mono break-all">
                  {data.summary.userId}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">이름</p>
                  <p className="text-sm font-medium">{data.summary.userName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">나이</p>
                  <p className="text-sm">{data.summary.age ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">생체 나이</p>
                  <p className="text-sm">{data.summary.biologicalAge ?? "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">시그니처 타입</p>
                  <p className="text-sm">{signatureTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">기초 대사량</p>
                  <p className="text-sm">{bmrText}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">활동 대사량</p>
                  <p className="text-sm">{tdeeText}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">건강 상태 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line break-keep">
              {data.summary.healthStatusSummary || "건강 상태 요약이 없습니다."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">시그니처 상세</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">요약</p>
              <p className="text-sm font-medium">{signatureTitle}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">설명</p>
              <p className="text-sm leading-relaxed whitespace-pre-line break-keep">
                {signatureDetail || "설명 정보가 없습니다."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top Risk</CardTitle>
          </CardHeader>
          <CardContent>
            {topRisks.length > 0 ? (
              <div className="space-y-2">
                {topRisks.map((risk, idx) => (
                  <div
                    key={`${risk.name}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {risk.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        위험도 {Math.round(risk.score)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      #{idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                등록된 위험 지표가 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">데이터 보유 현황</CardTitle>
            <span className="text-xs text-muted-foreground">
              마지막 업데이트: {lastUpdateText}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "프로필", has: availability.hasProfile },
              { label: "시그니처", has: availability.hasSignature },
              { label: "주간 플랜", has: availability.hasWeeklyPlan },
              { label: "채팅", has: availability.hasChat },
              { label: "이벤트", has: availability.hasEvent },
              {
                label: "라이프스타일 가이드",
                has: data.summary.hasLifestyleGuide,
              },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border",
                  item.has
                    ? "bg-[#238636]/10 border-[#238636]/30"
                    : "bg-muted/30 border-border",
                )}
              >
                {item.has ? (
                  <Check className="w-4 h-4 text-[#3FB950]" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-line break-keep">
            {data.summary.patientSummary || "요약 정보가 없습니다."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// 루틴 탭
// ============================================
function RoutineTab({ data }: { data: User360Data }) {
  const [showAllGoals, setShowAllGoals] = useState(false);

  const completionRateData = data.routine.dailyCompletionTrend
    .filter((d) => d.date && !isNaN(new Date(d.date).getTime()))
    .map((d) => {
      const planned = Number(d.planned || 0);
      const completed = Number(d.completed || 0);
      const rate = planned > 0 ? (completed / planned) * 100 : 0;

      return {
        date: formatMonthDay(d.date),
        수행율: rate,
        계획: planned,
        수행: completed,
      };
    });

  const domainData = data.routine.incompleteDomains.map((d) => ({
    name: d.domain,
    미수행: d.incompleteCount,
    비율: d.percentage,
    총계: d.totalCount,
  }));

  const goalsToShow = showAllGoals
    ? data.routine.weeklyGoals
    : data.routine.weeklyGoals.slice(0, 5);
  const totalGoals = data.routine.weeklyGoals.reduce(
    (sum, goal) => sum + Number(goal.targetCount || 0),
    0,
  );
  const completedGoals = data.routine.weeklyGoals.reduce(
    (sum, goal) => sum + Number(goal.completedCount || 0),
    0,
  );
  const inProgressGoals = Math.max(totalGoals - completedGoals, 0);
  const overallCompletionRateText = Number.isFinite(
    data.routine.overallCompletionRate,
  )
    ? `${data.routine.overallCompletionRate.toFixed(1)}%`
    : "-";

  const weekStartText =
    data.routine.currentWeekPlan?.weekStartDate &&
    !isNaN(new Date(data.routine.currentWeekPlan.weekStartDate).getTime())
      ? format(
          new Date(data.routine.currentWeekPlan.weekStartDate),
          "yyyy년 MM월 dd일",
          { locale: ko },
        )
      : null;

  const renderCompletionTooltip = ({
    active,
    payload,
  }: RechartsTooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    const datum = payload[0]?.payload as
      | { date: string; 수행율: number; 계획: number; 수행: number }
      | undefined;

    if (!datum) return null;

    return (
      <div className="rounded-md border border-[#30363D] bg-[#161B22] px-3 py-2 text-xs text-foreground">
        <p className="font-medium text-sm">{datum.date}</p>
        <div className="mt-1 space-y-1">
          <p>수행율: {datum.수행율.toFixed(1)}%</p>
          <p>계획: {formatInteger(datum.계획)}</p>
          <p>수행: {formatInteger(datum.수행)}</p>
        </div>
      </div>
    );
  };

  const renderDomainTooltip = ({
    active,
    payload,
  }: RechartsTooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    const datum = payload[0]?.payload as
      | { name: string; 미수행: number; 비율: number; 총계: number }
      | undefined;

    if (!datum) return null;

    return (
      <div className="rounded-md border border-[#30363D] bg-[#161B22] px-3 py-2 text-xs text-foreground">
        <p className="font-medium text-sm">{datum.name}</p>
        <div className="mt-1 space-y-1">
          <p>미수행: {formatInteger(datum.미수행)}</p>
          <p>총계: {formatInteger(datum.총계)}</p>
          <p>비율: {datum.비율.toFixed(1)}%</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">이번 주 주간 플랜</CardTitle>
          {weekStartText && (
            <CardDescription>{weekStartText} 시작</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {data.routine.currentWeekPlan ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-[#58A6FF]">
                    {totalGoals}
                  </p>
                  <p className="text-xs text-muted-foreground">총 목표</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-[#3FB950]">
                    {completedGoals}
                  </p>
                  <p className="text-xs text-muted-foreground">수행</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-[#D29922]">
                    {inProgressGoals}
                  </p>
                  <p className="text-xs text-muted-foreground">진행 중</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-[#A371F7]">
                    {overallCompletionRateText}
                  </p>
                  <p className="text-xs text-muted-foreground">전체 수행률</p>
                </div>
              </div>

              {data.routine.weeklyGoals.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">주간 목표</p>
                    {data.routine.weeklyGoals.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => setShowAllGoals((prev) => !prev)}
                      >
                        {showAllGoals ? "접기" : "전체 보기"}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {goalsToShow.map((goal, idx) => (
                      <div
                        key={`${goal.domain}-${goal.title}-${idx}`}
                        className="flex items-center justify-between gap-3 text-sm p-2 bg-muted/20 rounded"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-xs">
                            {goal.domain}
                          </Badge>
                          <span className="truncate">{goal.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                          {goal.completedCount}/{goal.targetCount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>이번 주 주간 플랜이 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">최근 14일 수행율 추이</CardTitle>
        </CardHeader>
        <CardContent>
          {completionRateData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={completionRateData}>
                  <defs>
                    <linearGradient
                      id="colorCompletion"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3FB950" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3FB950" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                  <XAxis dataKey="date" stroke="#8B949E" fontSize={12} />
                  <YAxis
                    stroke="#8B949E"
                    fontSize={12}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <RechartsTooltip content={renderCompletionTooltip} />
                  <Area
                    type="monotone"
                    dataKey="수행율"
                    stroke="#3FB950"
                    fillOpacity={1}
                    fill="url(#colorCompletion)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>선택 기간 내 루틴 활동 데이터가 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">미수행 영역 분석</CardTitle>
        </CardHeader>
        <CardContent>
          {domainData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                  <XAxis
                    type="number"
                    stroke="#8B949E"
                    fontSize={12}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#8B949E"
                    fontSize={12}
                    width={80}
                  />
                  <RechartsTooltip content={renderDomainTooltip} />
                  <Bar dataKey="비율" fill="#F85149" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>선택 기간 내 미수행 영역이 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// 커뮤니케이션 탭
// ============================================
function CommunicationTab({ data }: { data: User360Data }) {
  type MessageItem = User360Data["communication"]["recentMessages"][number];
  type ThreadItem = User360Data["communication"]["chatThreads"][number];

  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(
    null,
  );
  const [selectedThread, setSelectedThread] = useState<ThreadItem | null>(null);

  const totalMessages =
    data.communication.stats.sentCount + data.communication.stats.pendingCount;

  const formatJson = (value: string | null | undefined) => {
    if (!value) return "-";
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const threadTurns = selectedThread?.turns ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#58A6FF]" />
              <span className="text-xs text-muted-foreground">총 메시지</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatInteger(totalMessages)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#3FB950]" />
              <span className="text-xs text-muted-foreground">발송됨</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatInteger(data.communication.stats.sentCount)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D29922]" />
              <span className="text-xs text-muted-foreground">대기</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatInteger(data.communication.stats.pendingCount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">최근 발송 메시지</CardTitle>
          <CardDescription>최근 10건</CardDescription>
        </CardHeader>
        <CardContent>
          {data.communication.recentMessages.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {data.communication.recentMessages.map((msg) => {
                  const fullText = msg.bodyFull || msg.bodyPreview;
                  const hasFullText = fullText.length > msg.bodyPreview.length;

                  return (
                    <div
                      key={msg.id}
                      className="cursor-pointer p-3 bg-muted/20 rounded-lg border border-border"
                      onClick={() => setSelectedMessage(msg)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm truncate">
                          {msg.title}
                        </span>
                        <Badge
                          variant={msg.sent ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {msg.sent ? "발송됨" : "대기"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line break-keep">
                        {msg.bodyPreview}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {msg.createdAt &&
                          !isNaN(new Date(msg.createdAt).getTime())
                            ? format(
                                new Date(msg.createdAt),
                                "yyyy-MM-dd HH:mm",
                              )
                            : "-"}
                        </p>
                        {hasFullText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedMessage(msg);
                            }}
                          >
                            상세 보기
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>발송된 메시지가 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">최근 채팅 스레드</CardTitle>
          <CardDescription>최근 10건</CardDescription>
        </CardHeader>
        <CardContent>
          {data.communication.chatThreads.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {data.communication.chatThreads.map((thread) => (
                  <div
                    key={thread.threadId}
                    className="cursor-pointer p-3 bg-muted/20 rounded-lg border border-border"
                    onClick={() => setSelectedThread(thread)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {thread.botType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {thread.askedTurns}턴 대화
                      </span>
                    </div>
                    <div className="space-y-2">
                      {thread.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {thread.summary}
                        </p>
                      )}
                      {thread.lastQuestion && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            최근 질문
                          </span>
                          {": "}
                          <span className="block line-clamp-2">
                            {thread.lastQuestion}
                          </span>
                        </div>
                      )}
                      {thread.lastAnswer && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            사용자 응답
                          </span>
                          {": "}
                          <span className="block line-clamp-2">
                            {thread.lastAnswer}
                          </span>
                        </div>
                      )}
                      {thread.terminationReason && (
                        <Badge variant="secondary" className="text-xs">
                          종료: {thread.terminationReason}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDateTimeMinute(thread.updatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>채팅 기록이 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedMessage)}
        onOpenChange={(open) => {
          if (!open) setSelectedMessage(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.title ?? "메시지 상세"}</DialogTitle>
            <DialogDescription>
              {formatDateTimeMinute(selectedMessage?.createdAt)}
              {selectedMessage?.sent != null &&
                ` · ${selectedMessage.sent ? "발송됨" : "대기"}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="whitespace-pre-line break-keep">
              {selectedMessage?.bodyFull || selectedMessage?.bodyPreview || "-"}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedThread)}
        onOpenChange={(open) => {
          if (!open) setSelectedThread(null);
        }}
      >
        <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>채팅 스레드 상세</DialogTitle>
            <DialogDescription>
              {formatDateTimeMinute(selectedThread?.updatedAt)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {selectedThread?.botType || "-"}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {selectedThread?.askedTurns ?? 0}턴 대화
              </Badge>
              {selectedThread?.terminationReason && (
                <Badge variant="secondary" className="text-xs">
                  종료: {selectedThread.terminationReason}
                </Badge>
              )}
              {selectedThread?.userIntent && (
                <Badge variant="outline" className="text-xs">
                  intent: {selectedThread.userIntent}
                </Badge>
              )}
              {selectedThread?.incompleteIntent && (
                <Badge variant="outline" className="text-xs">
                  incomplete: {selectedThread.incompleteIntent}
                </Badge>
              )}
            </div>

            {selectedThread?.summary && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">요약</p>
                <p className="whitespace-pre-line break-keep">
                  {selectedThread.summary}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {threadTurns.length > 0 ? (
                threadTurns.map((turn) => (
                  <div
                    key={`${turn.turnIndex}-${turn.createdAt}`}
                    className="rounded-md border border-border bg-muted/20 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          #{turn.turnIndex}
                        </Badge>
                        {turn.eventType && (
                          <Badge variant="outline" className="text-[10px]">
                            {turn.eventType}
                          </Badge>
                        )}
                        {turn.userIntent && (
                          <Badge variant="outline" className="text-[10px]">
                            intent: {turn.userIntent}
                          </Badge>
                        )}
                        {turn.incompleteIntent && (
                          <Badge variant="outline" className="text-[10px]">
                            incomplete: {turn.incompleteIntent}
                          </Badge>
                        )}
                        {turn.terminationReason && (
                          <Badge variant="secondary" className="text-[10px]">
                            종료: {turn.terminationReason}
                          </Badge>
                        )}
                      </div>
                      <span>{formatDateTimeKST(turn.createdAt, true)}</span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          질문
                        </p>
                        <p className="text-sm whitespace-pre-line break-keep">
                          {turn.questionText || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          응답
                        </p>
                        <p className="text-sm whitespace-pre-line break-keep">
                          {turn.answerText || "미응답"}
                        </p>
                      </div>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-muted-foreground">
                        원본 JSON 보기
                      </summary>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            질문 원본
                          </p>
                          <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[11px] whitespace-pre-wrap break-words">
                            {formatJson(turn.questionRaw)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            응답 원본
                          </p>
                          <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[11px] whitespace-pre-wrap break-words">
                            {formatJson(turn.answerRaw)}
                          </pre>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">
                            응답 메시지 원본
                          </p>
                          <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[11px] whitespace-pre-wrap break-words">
                            {formatJson(turn.responseRaw)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  턴 기록이 없습니다.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// 운영/비용 탭
// ============================================
function OperationsTab({ data }: { data: User360Data }) {
  const llmUsageData = data.operations.llmUsageByCallType.map((d) => ({
    name: d.callType,
    호출수: d.callCount,
    비용: d.totalCost,
    평균지연: d.avgLatency,
    에러: d.errorCount,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#58A6FF]" />
              <span className="text-xs text-muted-foreground">총 호출</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatInteger(data.operations.totalLLMCalls)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#3FB950]" />
              <span className="text-xs text-muted-foreground">총 비용</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatCurrencyUSD(data.operations.totalLLMCost)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D29922]" />
              <span className="text-xs text-muted-foreground">평균 지연</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatMs(data.operations.avgLatency)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F85149]" />
              <span className="text-xs text-muted-foreground">에러율</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatPercent(data.operations.errorRate, "pct100", 1)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Call Type별 LLM 사용량</CardTitle>
        </CardHeader>
        <CardContent>
          {llmUsageData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={llmUsageData} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                  <XAxis
                    dataKey="name"
                    stroke="#8B949E"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tickFormatter={(value) =>
                      value.length > 20 ? `${value.slice(0, 20)}...` : value
                    }
                  />
                  <YAxis stroke="#8B949E" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#161B22",
                      border: "1px solid #30363D",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "비용")
                        return [formatCurrencyUSD(value), name];
                      if (name === "평균지연") return [formatMs(value), name];
                      return [formatInteger(value), name];
                    }}
                  />
                  <Bar dataKey="호출수" fill="#58A6FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>LLM 사용 기록이 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">최근 처리 실패</CardTitle>
          <CardDescription>최근 10건</CardDescription>
        </CardHeader>
        <CardContent>
          {data.operations.recentFailures.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {data.operations.recentFailures.map((job, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#F85149]/10 rounded-lg border border-[#F85149]/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="destructive" className="text-xs">
                        {job.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {job.id?.slice(0, 8) || "-"}
                      </span>
                    </div>
                    <p className="text-xs text-[#F85149] font-mono whitespace-pre-wrap">
                      {job.error || "(error 없음)"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimeMinute(job.startedAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {job.durationMs != null
                          ? `${Math.round(job.durationMs)}ms`
                          : "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>최근 실패한 작업이 없습니다. 시스템이 안정적입니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {data.operations.validationFailures.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">검증 실패 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-56">
              <div className="space-y-2">
                {data.operations.validationFailures.map((v, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#D29922]/10 rounded border border-[#D29922]/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {v.reasonCode} · {v.botType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimeMinute(v.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#D29922] mt-1">
                      {v.reasonText}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                      thread: {v.threadId?.slice(0, 14) || "-"}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// 메인 User360
// ============================================
export default function User360() {
  const params = useParams<{ userId?: string }>();
  const [, setLocation] = useLocation();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    params.userId || null,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "summary" | "routine" | "communication" | "operations"
  >("summary");

  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const health = useHealthCheck();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (params.userId) setSelectedUserId(params.userId);
  }, [params.userId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => window.clearTimeout(timerId);
  }, [searchQuery]);

  const {
    data: usersData,
    loading: usersLoading,
    refetch: refetchUsers,
  } = useUsersAPI(dateRange.start, dateRange.end, {
    query: debouncedQuery || undefined,
    page: 1,
    limit: 50,
  });

  const userList = usersData?.users ?? [];
  const filteredUsers = userList;

  const {
    data: user360Data,
    loading: user360Loading,
    error: user360Error,
    refetch,
  } = useUser360API(selectedUserId || "", dateRange.start, dateRange.end);

  useEffect(() => {
    if (!user360Loading && user360Data) {
      setLastUpdated(new Date());
    }
  }, [user360Loading, user360Data]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setSearchOpen(false);
    setActiveTab("summary");
    setLocation(`/user/${userId}`);
  };

  if (selectedUserId && user360Loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Database className="w-16 h-16 text-primary mb-4 animate-pulse" />
        <h2 className="text-lg font-medium text-foreground mb-2">
          User 360 로딩 중...
        </h2>
        <p className="text-sm text-muted-foreground">
          DB에서 사용자 상세 데이터를 불러오고 있습니다
        </p>
      </div>
    );
  }

  if (selectedUserId && user360Error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-2">
          User 360 로딩 실패
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{user360Error}</p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  const selectedUserName =
    user360Data?.summary.userName ||
    userList.find((u) => u.userId === selectedUserId)?.userName ||
    (selectedUserId ? selectedUserId.slice(0, 8) + "..." : "사용자 선택");

  const liveUpdatedText = health.lastSuccessAt
    ? format(health.lastSuccessAt, "HH:mm:ss")
    : "-";

  const tabs = [
    { id: "summary" as const, label: "요약", icon: Target },
    { id: "routine" as const, label: "루틴", icon: Calendar },
    {
      id: "communication" as const,
      label: "커뮤니케이션",
      icon: MessageSquare,
    },
    { id: "operations" as const, label: "운영/비용", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                사용자 360
              </h1>
              <p className="text-xs text-muted-foreground">User Drilldown</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DateFilter
              startDate={dateRange.start}
              endDate={dateRange.end}
              onDateChange={(start, end) => setDateRange({ start, end })}
              onRefresh={() => {
                refetch();
                refetchUsers();
              }}
              lastUpdated={lastUpdated}
            />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-border">
              <div
                className={`w-2 h-2 rounded-full ${
                  health.status === "ok"
                    ? "bg-[#3FB950] pulse-live"
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
                Updated {liveUpdatedText}
              </span>
            </div>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-40 justify-between">
                  <span className="truncate">{selectedUserName}</span>
                  <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-0" align="end">
                <Command>
                  <CommandInput
                    placeholder="사용자 검색..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>사용자를 찾을 수 없습니다</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-64">
                        {usersLoading && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            사용자 목록 불러오는 중...
                          </div>
                        )}
                        {filteredUsers.map((user) => (
                          <CommandItem
                            key={user.userId}
                            value={`${user.userName} ${user.userId}`}
                            onSelect={() => handleUserSelect(user.userId)}
                          >
                            <User className="w-4 h-4 mr-2" />
                            <span className="truncate">{user.userName}</span>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {!selectedUserId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              사용자를 선택해주세요
            </h2>
            <p className="text-sm text-muted-foreground">
              상단 검색창에서 사용자를 검색하거나 선택하세요.
            </p>
          </div>
        ) : !user360Data ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="w-16 h-16 text-[#D29922] mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              사용자 데이터를 찾을 수 없습니다
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              ID: {selectedUserId}
            </p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-1 p-1 bg-card border border-border rounded-lg w-fit">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div>
              {activeTab === "summary" && <SummaryTab data={user360Data} />}
              {activeTab === "routine" && <RoutineTab data={user360Data} />}
              {activeTab === "communication" && (
                <CommunicationTab data={user360Data} />
              )}
              {activeTab === "operations" && (
                <OperationsTab data={user360Data} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
