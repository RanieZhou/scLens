import { Router } from "express";
import { runnerAuthMiddleware, webAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as controller from "./result.controller.js";
import { TaskParamsSchema } from "./result.schema.js";
import { z } from "zod";

export const resultRoutes = Router();

resultRoutes.post(
  "/:taskId/results",
  runnerAuthMiddleware,
  validateRequest("params", TaskParamsSchema),
  controller.uploadMiddleware,
  controller.uploadResult
);

resultRoutes.get(
  "/:taskId/results",
  webAuthMiddleware,
  validateRequest("params", TaskParamsSchema),
  controller.listResults
);

const ResultFileParamsSchema = z.object({ taskId: z.string().uuid(), resultFileId: z.string().uuid() });

resultRoutes.get(
  "/:taskId/results/:resultFileId",
  validateRequest("params", ResultFileParamsSchema),
  controller.downloadResult
);
