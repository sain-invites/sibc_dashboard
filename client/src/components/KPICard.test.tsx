import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import KPICard from "./KPICard";

describe("KPICard", () => {
  it("renders KPI value correctly", () => {
    const mockData = {
      id: "test-kpi",
      title: "Test Metric",
      value: 1234,
      formattedValue: "1,234",
      unit: "users",
      status: "success" as const,
      trend: 5.2,
      trendDirection: "up" as const,
      sparklineData: [1000, 1100, 1150, 1200, 1210, 1220, 1234],
      description: "Test description",
    };

    render(<KPICard data={mockData} />);
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("Test Metric")).toBeInTheDocument();
  });

  it("renders warning status correctly", () => {
    const mockData = {
      id: "test-kpi",
      title: "Test Metric",
      value: 100,
      formattedValue: "100",
      unit: "users",
      status: "warning" as const,
      trend: 0,
      trendDirection: "flat" as const,
      sparklineData: [100, 100, 100, 100, 100, 100, 100],
      description: "Test description",
    };

    render(<KPICard data={mockData} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders danger status correctly", () => {
    const mockData = {
      id: "test-kpi",
      title: "Test Metric",
      value: 50,
      formattedValue: "50",
      unit: "users",
      status: "danger" as const,
      trend: -10,
      trendDirection: "down" as const,
      sparklineData: [60, 58, 55, 53, 51, 50, 50],
      description: "Test description",
    };

    render(<KPICard data={mockData} />);
    expect(screen.getByText("50")).toBeInTheDocument();
  });
});
