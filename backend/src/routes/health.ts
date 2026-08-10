// =============================================================================
//  Route – GET /health
// =============================================================================
import { Router, Request, Response } from "express";
import { prisma } from "../services/dbService";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", db: "disconnected" });
  }
});

export default router;
