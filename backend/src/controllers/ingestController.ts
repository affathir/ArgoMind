// =============================================================================
//  Controller – POST /api/v1/ingest
//  Persists sensor reading, triggers async ML forecast update
// =============================================================================
import { Request, Response, NextFunction } from "express";
import { prisma }     from "../services/dbService";
import { logger }     from "../config/logger";
import { requestForecast } from "../services/mlService";

export async function ingestReading(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      deviceId, soilMoisture, soilTemperature,
      airTemperature, airHumidity, timestamp,
    } = req.body;

    // Persist reading
    const reading = await prisma.sensorReading.create({
      data: {
        deviceId,
        soilMoisture,
        soilTemperature,
        airTemperature,
        airHumidity,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    // Update device lastSeenAt
    await prisma.device.updateMany({
      where: { id: deviceId },
      data:  { lastSeenAt: new Date() },
    });

    logger.debug(`Ingested reading ${reading.id} for device ${deviceId}`);

    // Trigger ML forecast in background (non-blocking)
    requestForecast(deviceId).catch((err) =>
      logger.warn(`Background forecast failed for ${deviceId}: ${err.message}`)
    );

    res.status(201).json({ id: reading.id, accepted: true });
  } catch (err) {
    next(err);
  }
}
