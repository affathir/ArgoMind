// =============================================================================
//  AgriMind Backend – Express application factory
// =============================================================================
import express from "express";
import helmet  from "helmet";
import cors    from "cors";
import morgan  from "morgan";
import rateLimit from "express-rate-limit";

import { env }            from "./config/env";
import { logger }         from "./config/logger";
import { errorHandler }   from "./middleware/errorHandler";
import { notFound }       from "./middleware/notFound";

import healthRouter    from "./routes/health";
import ingestRouter    from "./routes/ingest";
import predictRouter   from "./routes/predict";
import insightRouter   from "./routes/insight";
import dashboardRouter from "./routes/dashboard";

export function createApp() {
  const app = express();

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: env.NODE_ENV === "production"
      ? ["http://localhost", "http://frontend:3000"]
      : true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }));

  // ── Body parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: "64kb" }));

  // ── HTTP request logging ───────────────────────────────────────────────────
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));

  // ── Global rate limiter ───────────────────────────────────────────────────
  app.use(rateLimit({
    windowMs: 60 * 1000,   // 1 minute
    max:      120,          // 120 requests per minute per IP
    standardHeaders: true,
    legacyHeaders:   false,
    message: { error: "Too many requests, please try again later." },
  }));

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use("/health",           healthRouter);
  app.use("/api/v1/ingest",    ingestRouter);
  app.use("/api/v1/predict",   predictRouter);
  app.use("/api/v1/insight",   insightRouter);
  app.use("/api/v1/dashboard", dashboardRouter);

  // ── 404 + Error handlers ───────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
