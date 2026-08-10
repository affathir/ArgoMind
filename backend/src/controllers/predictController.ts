// =============================================================================
//  Controller – GET /api/v1/predict/:deviceId
// =============================================================================
import { Request, Response, NextFunction } from "express";
import { requestForecast } from "../services/mlService";
import { prisma }          from "../services/dbService";

export async function getPrediction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { deviceId } = req.params;

    // Check device exists
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    const forecast = await requestForecast(deviceId);
    res.json(forecast);
  } catch (err) {
    next(err);
  }
}
