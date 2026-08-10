// =============================================================================
//  Route – GET /api/v1/predict/:deviceId
//  Returns ML soil moisture forecast for a device
// =============================================================================
import { Router } from "express";
import { getPrediction } from "../controllers/predictController";

const router = Router();

router.get("/:deviceId", getPrediction);

export default router;
