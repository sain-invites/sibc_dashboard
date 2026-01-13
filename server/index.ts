import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

// API 라우트
import overviewRouter from "./routes/overview.js";
import usersRouter from "./routes/users.js";
import user360Router from "./routes/user360.js";
import { testConnection, closePool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

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

  // DB 연결 테스트 (환경변수가 설정된 경우에만)
  if (process.env.DB_HOST) {
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log("Database connected successfully");
    } else {
      console.warn(
        "Database connection failed - API routes will return errors",
      );
    }
  } else {
    console.log("DB_HOST not set - running in static mode (CSV fallback)");
  }

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
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("Unhandled error:", err);
      res.status(500).json({
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    },
  );

  const port = process.env.PORT || 3001;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, closing connections...");
    await closePool();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
}

startServer().catch(console.error);
