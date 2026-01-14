import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import NodeCache from "node-cache";

// API 라우트
import overviewRouter from "./routes/overview.js";
import usersRouter from "./routes/users.js";
import user360Router from "./routes/user360.js";
import { testConnection, closePool } from "./db.js";
import { logError, logInfo, requestLogger } from "./lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(requestLogger());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/", limiter);

  // API 라우트 마운트
  app.use("/api/overview", overviewRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/user360", user360Router);

  // 헬스체크 엔드포인트
  app.get("/api/health", async (_req, res) => {
    const dbStatus = process.env.DB_HOST ? await testConnection() : false;
    res.json({
      status: "ok",
      database: dbStatus ? "connected" : "disconnected",
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // 에러 핸들러
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logError("request.error", {
        requestId: res.locals.requestId,
        method: req.method,
        path: req.originalUrl,
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
      res.status(500).json({
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    },
  );

  const port = process.env.PORT || 3001;

  server.listen(port, () => {
    logInfo("server.started", { port });
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logInfo("server.shutdown", { reason: "SIGTERM" });
    await closePool();
    server.close(() => {
      logInfo("server.closed");
      process.exit(0);
    });
  });
}

startServer().catch((error) => {
  logError("server.start_failed", { error: (error as Error).message });
});
