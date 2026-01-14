import { describe, it, expect } from "vitest";
import {
  formatCurrencyUSD,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatDateKST,
  formatDateTimeKST,
} from "./formatters";

describe("formatters", () => {
  it("formats integers and decimals", () => {
    expect(formatInteger(1234.56)).toBe("1,234");
    expect(formatDecimal(12.3456, 2)).toBe("12.35");
  });

  it("formats currency", () => {
    expect(formatCurrencyUSD(1234)).toBe("$1,234");
  });

  it("formats percent with modes", () => {
    expect(formatPercent(0.125, "ratio01", 1)).toBe("12.5%");
    expect(formatPercent(12.5, "pct100", 1)).toBe("12.5%");
  });

  it("formats KST dates", () => {
    const iso = "2025-01-10T12:34:56Z";
    expect(formatDateKST(iso)).toBe("2025-01-10");
    expect(formatDateTimeKST(iso)).toMatch(/^2025-01-10 \d{2}:\d{2}/);
  });
});
