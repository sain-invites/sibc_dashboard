import { describe, it, expect } from "vitest";
import {
  DateParamSchema,
  PaginationParamsSchema,
  UserIdSchema,
} from "./validators";

describe("validators", () => {
  it("accepts valid date params", () => {
    const result = DateParamSchema.safeParse("2025-12-31");
    expect(result.success).toBe(true);
  });

  it("rejects invalid date params", () => {
    const result = DateParamSchema.safeParse("12/31/2025");
    expect(result.success).toBe(false);
  });

  it("applies pagination defaults", () => {
    const result = PaginationParamsSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("rejects invalid user ids", () => {
    const result = UserIdSchema.safeParse("invalid id!");
    expect(result.success).toBe(false);
  });
});
