import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { requestIdMiddleware } from "./middlewares/request-id.middleware.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { projectRoutes } from "./modules/project/project.routes.js";
import { pairingRoutes, projectPairingRoutes } from "./modules/pairing/pairing.routes.js";
import { runnerRoutes, projectRunnerRoutes } from "./modules/runner/runner.routes.js";
import { projectTaskRoutes, taskRoutes, runnerTaskRoutes } from "./modules/task/task.routes.js";
import { resultRoutes } from "./modules/result/result.routes.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  app.use("/api", healthRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/projects", projectPairingRoutes);
  app.use("/api/projects", projectRunnerRoutes);
  app.use("/api/projects", projectTaskRoutes);
  app.use("/api/runners", pairingRoutes);
  app.use("/api/runners", runnerRoutes);
  app.use("/api/runners", runnerTaskRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/tasks", resultRoutes);

  app.use(errorMiddleware);

  return app;
}
