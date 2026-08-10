// =============================================================================
//  Route – GET /api/v1/insight/:deviceId
//         GET /api/v1/insight/:deviceId/stream  (SSE)
// =============================================================================
import { Router } from "express";
import { getInsight, streamInsight } from "../controllers/insightController";

const router = Router();

// Standard JSON response (cached last insight)
router.get("/:deviceId", getInsight);

// Server-Sent Events stream of live LLM generation
router.get("/:deviceId/stream", streamInsight);

export default router;
