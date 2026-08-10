// =============================================================================
//  Controller – GET /api/v1/insight/:deviceId
//              GET /api/v1/insight/:deviceId/stream (SSE)
// =============================================================================
import { Request, Response, NextFunction } from "express";
import { prisma }          from "../services/dbService";
import { generateInsight, streamInsightSSE } from "../services/watsonxService";

// ── Static JSON ───────────────────────────────────────────────────────────────
export async function getInsight(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { deviceId } = req.params;

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    const insight = await generateInsight(deviceId);
    res.json(insight);
  } catch (err) {
    next(err);
  }
}

// ── SSE stream ─────────────────────────────────────────────────────────────────
export async function streamInsight(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { deviceId } = req.params;

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Set SSE headers
    res.setHeader("Content-Type",  "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection",    "keep-alive");
    res.flushHeaders();

    // Stream LLM tokens to client
    await streamInsightSSE(deviceId, (chunk: string) => {
      res.write(`data: ${chunk}\n\n`);
    });

    // Signal stream end
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    next(err);
  }
}
