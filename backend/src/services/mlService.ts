// =============================================================================
//  Service – ML micro-service client
//  Calls the Python prediction API running in the `ml` container.
// =============================================================================
import { env }    from "../config/env";
import { logger } from "../config/logger";
import { prisma } from "./dbService";

// Shape returned by the Python prediction service
interface MlPredictionResponse {
  predictions: { hoursAhead: number; soilMoisture: number; confidence: number }[];
  droughtStressLevel: 0 | 1 | 2 | 3;
  droughtStressLabel: "healthy" | "watch" | "alert" | "critical";
}

/**
 * Fetches the last 48 h of readings for a device, sends them to the
 * Python ML service, persists the result, and returns it.
 */
export async function requestForecast(deviceId: string): Promise<MlPredictionResponse & { deviceId: string; generatedAt: string }> {
  // Pull last 48 h of readings as feature input
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const readings = await prisma.sensorReading.findMany({
    where:   { deviceId, timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
    select: {
      timestamp:       true,
      soilMoisture:    true,
      soilTemperature: true,
      airTemperature:  true,
      airHumidity:     true,
    },
  });

  if (readings.length === 0) {
    // Return a safe default when no data exists yet
    return {
      deviceId,
      generatedAt: new Date().toISOString(),
      predictions: [
        { hoursAhead: 24, soilMoisture: 50, confidence: 0 },
        { hoursAhead: 48, soilMoisture: 50, confidence: 0 },
        { hoursAhead: 72, soilMoisture: 50, confidence: 0 },
      ],
      droughtStressLevel: 0,
      droughtStressLabel: "healthy",
    };
  }

  logger.debug(`Calling ML service for device ${deviceId} with ${readings.length} readings`);

  const response = await fetch(`${env.ML_SERVICE_URL}/predict`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ deviceId, readings }),
    signal:  AbortSignal.timeout(10_000),   // 10 s timeout
  });

  if (!response.ok) {
    throw new Error(`ML service error: ${response.status}`);
  }

  const mlResult = (await response.json()) as MlPredictionResponse;

  // Persist forecast to DB
  await prisma.mlForecast.create({
    data: {
      deviceId,
      droughtStressLevel: mlResult.droughtStressLevel,
      droughtStressLabel: mlResult.droughtStressLabel,
      predictions:        mlResult.predictions,
    },
  });

  return {
    deviceId,
    generatedAt: new Date().toISOString(),
    ...mlResult,
  };
}
