// =============================================================================
//  Route – POST /api/v1/ingest
//  Receives sensor payload from ESP32 devices
// =============================================================================
import { Router } from "express";
import { z }      from "zod";
import { validate }         from "../middleware/validate";
import { ingestReading }    from "../controllers/ingestController";

const router = Router();

export const sensorPayloadSchema = z.object({
  deviceId:         z.string().min(1),
  soilMoisture:     z.number().min(0).max(100),
  soilTemperature:  z.number().min(-40).max(80),
  airTemperature:   z.number().min(-40).max(80),
  airHumidity:      z.number().min(0).max(100),
  // Optional timestamp from device; defaults to server time if absent
  timestamp:        z.string().datetime().optional(),
});

router.post("/", validate(sensorPayloadSchema), ingestReading);

export default router;
