// =============================================================================
//  Middleware – Global error handler
// =============================================================================
import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { env }    from "../config/env";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status  = err.statusCode ?? 500;
  const message = err.message    ?? "Internal server error";

  // Only log stack traces in development
  if (env.NODE_ENV !== "production") {
    logger.error(`${status} — ${message}`, { stack: err.stack });
  } else {
    logger.error(`${status} — ${message}`);
  }

  res.status(status).json({
    error:   message,
    ...(env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
