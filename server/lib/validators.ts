import { z } from "zod";

export const DateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format",
});

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const UserIdSchema = z
  .string()
  .min(1, "User ID cannot be empty")
  .max(100, "User ID too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "User ID contains invalid characters");

export const SearchQuerySchema = z.string().max(100, "Search query too long").optional();

export const SortParamsSchema = z.object({
  sort: z
    .enum([
      "userName",
      "eventCount",
      "completedRoutines",
      "createdRoutines",
      "completionRate",
      "llmCost",
      "lastActivity",
    ])
    .optional(),
  order: z.enum(["asc", "desc"]).optional(),
});
