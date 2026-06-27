import { Router } from "express";
import { webAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as controller from "./pairing.controller.js";
import {
  CreatePairingSessionSchema,
  PairingSessionParamsSchema,
  PairRunnerSchema,
  ProjectParamsSchema
} from "./pairing.schema.js";

export const pairingRoutes = Router();
export const projectPairingRoutes = Router({ mergeParams: true });

// Runner calls – no web auth
pairingRoutes.post(
  "/pairing-sessions",
  validateRequest("body", CreatePairingSessionSchema),
  controller.createSession
);
pairingRoutes.get(
  "/pairing-sessions/:pairingSessionId",
  validateRequest("params", PairingSessionParamsSchema),
  controller.getSessionStatus
);

// Web call – requires web auth
projectPairingRoutes.post(
  "/:projectId/pair-runner",
  webAuthMiddleware,
  validateRequest("params", ProjectParamsSchema),
  validateRequest("body", PairRunnerSchema),
  controller.pairRunner
);
