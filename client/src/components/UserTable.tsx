/**
 * User Table Component (API 기반)
 *
 * /api/users를 호출해서 사용자 목록을 표시하고
 * 클릭 시 User 360(/user/:userId)으로 드릴다운합니다.
 */

import {
  formatInteger,
  formatPercent,
  formatCurrencyUSD,
  formatDateTimeKST,
} from "@/lib/formatters";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsersAPI } from "@/hooks/useAPI";

interface UserTableProps {
  startDate: Date;
  endDate: Date;
}

type SortKey =
  | "userName"
  | "eventCount"
  | "completedRoutines"
  | "createdRoutines"
  | "completionRate"
  | "llmCost"
  | "lastActivity";

type SortOrder = "asc" | "desc";

export function UserTable({ startDate, endDate }: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("lastActivity");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [, setLocation] = useLocation();
  const pageSize = 10;

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => window.clearTimeout(timerId);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);

  const { data, loading, error } = useUsersAPI(startDate, endDate, {
    query: debouncedQuery || undefined,
    page: currentPage,
    limit: pageSize,
    sort: sortKey,
    order: sortOrder,
  });

  const rows = useMemo(() => data?.users ?? [], [data]);

  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  const rangeText = useMemo(() => {
    if (!data?.pagination) return "";
    const from = (data.pagination.page - 1) * data.pagination.limit + 1;
    const to = Math.min(
      data.pagination.page * data.pagination.limit,
      data.pagination.total,
    );
    return `총 ${data.pagination.total}명 중 ${from}-${to}명`;
  }, [data]);

  const handleSort = (key: SortKey) => {
    setCurrentPage(1);
    if (key === sortKey) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortOrder(key === "userName" ? "asc" : "desc");
  };

  const renderSortIcon = (key: SortKey) => {
    if (key === sortKey) {
      return sortOrder === "asc" ? (
        <ChevronUp className="h-3 w-3 text-foreground" />
      ) : (
        <ChevronDown className="h-3 w-3 text-foreground" />
      );
    }
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
  };

  const renderHeader = (
    label: string,
    key: SortKey,
    align: "left" | "right" = "left",
    tooltip?: string,
  ) => (
    <TableHead
      className={cn(
        "bg-muted/50 text-muted-foreground",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={cn(
          "flex w-full items-center gap-1.5 text-sm font-medium",
          align === "right" ? "justify-end" : "justify-start",
        )}
      >
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1">
                <span>{label}</span>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span>{label}</span>
        )}
        {renderSortIcon(key)}
      </button>
    </TableHead>
  );

  const renderColGroup = () => (
    <colgroup>
      <col className="w-[22%]" />
      <col className="w-[9%]" />
      <col className="w-[12%]" />
      <col className="w-[10%]" />
      <col className="w-[10%]" />
      <col className="w-[10%]" />
      <col className="w-[19%]" />
    </colgroup>
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="사용자 검색..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-9 bg-background border-border"
        />
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <div className="bg-muted/50">
          <Table className="table-fixed">
            {renderColGroup()}
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {renderHeader("사용자", "userName", "left")}
                {renderHeader(
                  "이벤트",
                  "eventCount",
                  "right",
                  "선택 기간 내 사용자 이벤트 로그 건수",
                )}
                {renderHeader(
                  "수행 루틴",
                  "completedRoutines",
                  "right",
                  "완료 처리된 루틴 활동 건수",
                )}
                {renderHeader(
                  "생성 루틴",
                  "createdRoutines",
                  "right",
                  "선택 기간 내 생성된 루틴 활동 전체 건수",
                )}
                {renderHeader("완료율", "completionRate", "right")}
                {renderHeader("LLM 비용", "llmCost", "right")}
                {renderHeader("최근 활동", "lastActivity", "right")}
              </TableRow>
            </TableHeader>
          </Table>
        </div>

        <div className="h-[400px] overflow-y-auto">
          <Table className="table-fixed">
            {renderColGroup()}
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    사용자 목록을 불러오는 중...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchQuery
                      ? "조건에 맞는 검색 결과가 없습니다."
                      : "표시할 사용자 데이터가 존재하지 않습니다."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const lastActivityText = formatDateTimeKST(
                    row.lastActivity,
                    true,
                  );
                  // completionRate는 “0~100인지 / 0~1인지”가 가장 자주 꼬이는 지점이라,
                  // 여기서 한 번만 정규화해서 아래에서 계속 completionPct만 쓰게 만듭니다.
                  const rawCompletion = Number(row.completionRate);
                  const completionPct =
                    rawCompletion <= 1 ? rawCompletion * 100 : rawCompletion;

                  // 표시 텍스트(예: 73%)
                  const completionText = formatPercent(
                    completionPct,
                    "pct100",
                    1,
                  );

                  return (
                    <TableRow
                      key={row.userId}
                      className="border-border cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/user/${row.userId}`)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {row.userName}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {row.userId.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="text-sm text-foreground">
                          {formatInteger(row.eventCount)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="text-sm text-foreground">
                          {formatInteger(row.completedRoutines)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="text-sm text-foreground">
                          {formatInteger(row.createdRoutines)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            completionPct >= 70 &&
                              "border-green-500 text-green-500 bg-green-500/5",
                            completionPct >= 30 &&
                              completionPct < 70 &&
                              "border-yellow-500 text-yellow-500 bg-yellow-500/5",
                            completionPct < 30 &&
                              "border-red-500 text-red-500 bg-red-500/5",
                          )}
                        >
                          {completionText}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="text-sm text-foreground font-mono">
                          {formatCurrencyUSD(row.llmCost)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {lastActivityText}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {rangeText || `총 ${total}명`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
