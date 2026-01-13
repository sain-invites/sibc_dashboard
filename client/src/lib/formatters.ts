// client/src/lib/formatters.ts
type PercentMode = "ratio01" | "pct100";

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatInteger(v: unknown): string {
  const n = Math.trunc(toNum(v));
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function formatDecimal(v: unknown, digits: number): string {
  const n = toNum(v);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatCurrencyUSD(v: unknown): string {
  const n = toNum(v);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPercent(
  v: unknown,
  mode: PercentMode,
  digits: number = 1,
): string {
  const n = toNum(v);
  const pct = mode === "ratio01" ? n * 100 : n;

  // 개발 중 조기 탐지(원하면 유지, 싫으면 제거)
  if (import.meta.env.DEV) {
    if (mode === "ratio01" && n > 1.2)
      console.warn("[formatPercent] expected 0~1, got:", n);
    if (mode === "pct100" && n > 120)
      console.warn("[formatPercent] expected 0~100, got:", n);
  }

  return `${formatDecimal(pct, digits)}%`;
}

export function formatMs(v: unknown): string {
  const n = Math.round(toNum(v));
  return `${formatInteger(n)}ms`;
}

function normalizeDateInput(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return trimmed;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.replace(" ", "T").replace(" +", "+").replace(" -", "-");
  }

  return trimmed;
}

export function formatDateTimeKST(
  iso: string | null | undefined,
  withSeconds: boolean = false,
): string {
  if (!iso) return "-";
  const normalized = normalizeDateInput(iso);
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "-";

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const hh = get("hour");
  const mi = get("minute");
  const ss = get("second");

  return withSeconds
    ? `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
    : `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
