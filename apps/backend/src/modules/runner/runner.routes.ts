import { Router } from "express";
import { runnerAuthMiddleware, webAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as controller from "./runner.controller.js";
import {
  HeartbeatSchema,
  ProjectRunnerParamsSchema,
  RunnerParamsSchema,
  UploadProfileSchema
} from "./runner.schema.js";
import { ProjectParamsSchema as ProjectParams } from "../pairing/pairing.schema.js";

// Routes mounted at /api/runners
export const runnerRoutes = Router();

runnerRoutes.post(
  "/:runnerId/heartbeat",
  runnerAuthMiddleware,
  validateRequest("params", RunnerParamsSchema),
  validateRequest("body", HeartbeatSchema),
  controller.heartbeat
);

runnerRoutes.post(
  "/:runnerId/profile",
  runnerAuthMiddleware,
  validateRequest("params", RunnerParamsSchema),
  validateRequest("body", UploadProfileSchema),
  controller.uploadProfile
);

// Routes mounted at /api/projects/:projectId
export const projectRunnerRoutes = Router({ mergeParams: true });

projectRunnerRoutes.get(
  "/:projectId/runners",
  webAuthMiddleware,
  validateRequest("params", ProjectParams),
  controller.getProjectRunners
);

projectRunnerRoutes.delete(
  "/:projectId/runners/:runnerId",
  webAuthMiddleware,
  validateRequest("params", ProjectRunnerParamsSchema),
  controller.unbindRunner
);
