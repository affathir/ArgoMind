// =============================================================================
//  Middleware – 404 not found handler
// =============================================================================
import { Request, Response } from "express";

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}
