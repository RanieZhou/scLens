import { Router } from "express";
import { runnerAuthMiddleware, webAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as controller from "./task.controller.js";
import {
  AddLogSchema,
  CreateTaskSchema,
  ProjectTaskParamsSchema,
  RunnerParamsSchema,
  TaskParamsSchema,
  UpdateTaskStatusSchema
} from "./task.schema.js";

// Mounted at /api/projects/:projectId
export const projectTaskRoutes = Router({ mergeParams: true });

projectTaskRoutes.post(
  "/:projectId/tasks",
  webAuthMiddleware,
  validateRequest("params", ProjectTaskParamsSchema),
  validateRequest("body", CreateTaskSchema),
  controller.createTask
);

projectTaskRoutes.get(
  "/:projectId/tasks",
  webAuthMiddleware,
  validateRequest("params", ProjectTaskParamsSchema),
  controller.listTasks
);

// Mounted at /api/tasks
export const taskRoutes = Router();

taskRoutes.get("/:taskId", validateRequest("params", TaskParamsSchema), controller.getTask);

taskRoutes.post(
  "/:taskId/status",
  runnerAuthMiddleware,
  validateRequest("params", TaskParamsSchema),
  validateRequest("body", UpdateTaskStatusSchema),
  controller.updateStatus
);

taskRoutes.post(
  "/:taskId/logs",
  runnerAuthMiddleware,
  validateRequest("params", TaskParamsSchema),
  validateRequest("body", AddLogSchema),
  controller.addLog
);

taskRoutes.get("/:taskId/logs", validateRequest("params", TaskParamsSchema), controller.getLogs);

// Mounted at /api/runners/:runnerId
export const runnerTaskRoutes = Router({ mergeParams: true });

runnerTaskRoutes.get(
  "/:runnerId/tasks/pending",
  runnerAuthMiddleware,
  validateRequest("params", RunnerParamsSchema),
  controller.getPendingTasks
);
