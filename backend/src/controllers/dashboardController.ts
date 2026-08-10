// =============================================================================
//  Controller – GET /api/v1/dashboard/:deviceId
//  Single aggregated endpoint for the frontend dashboard poll
// =============================================================================
import { Request, Response, NextFunction } from "express";
import { prisma }          from "../services/dbService";
import { requestForecast } from "../services/mlService";
import { generateInsight } from "../services/watsonxService";

const HISTORY_HOURS = 24;

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { deviceId } = req.params;

    // ── 1. Fetch device ──────────────────────────────────────────────────────
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // ── 2. Latest reading ────────────────────────────────────────────────────
    const latest = await prisma.sensorReading.findFirst({
      where:   { deviceId },
      orderBy: { timestamp: "desc" },
    });

    if (!latest) {
      res.status(404).json({ error: "No sensor readings found for this device" });
      return;
    }

    // ── 3. History (last 24 h) ───────────────────────────────────────────────
    const since = new Date(Date.now() - HISTORY_HOURS * 60 * 60 * 1000);
    const history = await prisma.sensorReading.findMany({
      where:   { deviceId, timestamp: { gte: since } },
      orderBy: { timestamp: "asc" },
    });

    // ── 4. ML Forecast ───────────────────────────────────────────────────────
    const forecast = await requestForecast(deviceId);

    // ── 5. AI Insight ────────────────────────────────────────────────────────
    const insight = await generateInsight(deviceId);

    // ── 6. Compose response ──────────────────────────────────────────────────
    res.json({
      device: {
        id:          device.id,
        name:        device.name,
        location:    device.location,
        cropType:    device.cropType,
        growthStage: device.growthStage,
        lastSeenAt:  device.lastSeenAt?.toISOString(),
      },
      latest,
      history,
      forecast,
      insight,
    });
  } catch (err) {
    next(err);
  }
}
