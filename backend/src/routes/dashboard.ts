// =============================================================================
//  Route – GET /api/v1/dashboard/:deviceId
//  Returns full aggregated payload: device + latest + history + forecast + insight
// =============================================================================
import { Router } from "express";
import { getDashboard } from "../controllers/dashboardController";

const router = Router();

router.get("/:deviceId", getDashboard);

export default router;
