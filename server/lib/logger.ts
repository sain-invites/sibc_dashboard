import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  time: string;
  context?: Record<string, unknown>;
}

function emit(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
) {
  const entry: LogEntry = {
    level,
    message,
    time: new Date().toISOString(),
    context,
  };
  const payload = JSON.stringify(entry);
  if (level === "error") {
    console.error(payload);
    return;
  }
  console.log(payload);
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  emit("info", message, context);
}

export function logWarn(message: string, context?: Record<string, unknown>) {
  emit("warn", message, context);
}

export function logError(message: string, context?: Record<string, unknown>) {
  emit("error", message, context);
}

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    const requestId = crypto.randomUUID();
    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      emit("info", "request.completed", {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    res.locals.requestId = requestId;
    next();
  };
}
