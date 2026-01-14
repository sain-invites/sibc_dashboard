/**
 * Date Filter Component
 *
 * 기간 선택 필터
 * Command Center 스타일
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";

interface DateFilterProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
  onRefresh?: () => void;
  lastUpdated?: Date;
}

// 프리셋 기간 옵션
const presets = [
  { label: "오늘", getValue: () => ({ start: new Date(), end: new Date() }) },
  {
    label: "최근 7일",
    getValue: () => ({ start: subDays(new Date(), 6), end: new Date() }),
  },
  {
    label: "최근 14일",
    getValue: () => ({ start: subDays(new Date(), 13), end: new Date() }),
  },
  {
    label: "최근 30일",
    getValue: () => ({ start: subDays(new Date(), 29), end: new Date() }),
  },
  {
    label: "이번 달",
    getValue: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    }),
  },
  {
    label: "지난 달",
    getValue: () => ({
      start: startOfMonth(subMonths(new Date(), 1)),
      end: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
  {
    label: "전체",
    getValue: () => ({ start: new Date(2024, 0, 1), end: new Date() }),
  },
];

export function DateFilter({
  startDate,
  endDate,
  onDateChange,
  onRefresh,
  lastUpdated,
}: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | undefined>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | undefined>(endDate);
  const [startMonth, setStartMonth] = useState<Date>(startDate);
  const [endMonth, setEndMonth] = useState<Date>(endDate);

  useEffect(() => {
    if (!isOpen) return;
    setTempStart(startDate);
    setTempEnd(endDate);
    setStartMonth(startDate);
    setEndMonth(endDate);
  }, [isOpen, startDate, endDate]);

  const isRangeValid =
    !!tempStart && !!tempEnd && tempStart.getTime() <= tempEnd.getTime();

  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const { start, end } = preset.getValue();
    onDateChange(start, end);
    setIsOpen(false);
  };

  const handleApply = () => {
    if (isRangeValid && tempStart && tempEnd) {
      onDateChange(tempStart, tempEnd);
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    return `${format(startDate, "yyyy.MM.dd")} - ${format(endDate, "yyyy.MM.dd")}`;
  };

  return (
    <div className="flex items-center gap-3">
      {/* 날짜 선택 */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal bg-card border-border hover:bg-muted",
              "text-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{formatDateRange()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-card border-border"
          align="start"
        >
          <div className="flex">
            {/* 프리셋 */}
            <div className="w-28 border-r border-border p-3 space-y-1">
              <p className="text-xs text-muted-foreground mb-2 px-2">
                빠른 선택
              </p>
              {presets.map((preset, index) => (
                <div key={preset.label}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm hover:bg-muted"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                  {index === 3 && (
                    <div className="my-1 border-b border-border" />
                  )}
                </div>
              ))}
            </div>

            {/* 캘린더 */}
            <div className="p-3">
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">시작일</p>
                  <Calendar
                    mode="single"
                    month={startMonth}
                    onMonthChange={setStartMonth}
                    selected={tempStart}
                    onSelect={(date) => {
                      if (!date) return;
                      if (tempEnd && date.getTime() > tempEnd.getTime()) return;
                      setTempStart(date);
                      setStartMonth(date);
                    }}
                    disabled={(date) =>
                      !!tempEnd && date.getTime() > tempEnd.getTime()
                    }
                    locale={ko}
                    className="rounded-md"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">종료일</p>
                  <Calendar
                    mode="single"
                    month={endMonth}
                    onMonthChange={setEndMonth}
                    selected={tempEnd}
                    onSelect={(date) => {
                      if (!date) return;
                      if (tempStart && date.getTime() < tempStart.getTime())
                        return;
                      setTempEnd(date);
                      setEndMonth(date);
                    }}
                    disabled={(date) =>
                      !!tempStart && date.getTime() < tempStart.getTime()
                    }
                    locale={ko}
                    className="rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!isRangeValid}
                >
                  적용
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 새로고침 버튼 */}
      {onRefresh && (
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="bg-card border-border hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}

      {/* 마지막 업데이트 시간 */}
      {lastUpdated && (
        <span className="text-xs text-muted-foreground">
          마지막 업데이트: {format(lastUpdated, "HH:mm:ss")}
        </span>
      )}
    </div>
  );
}

export default DateFilter;
