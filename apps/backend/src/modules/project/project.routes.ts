import { Router } from "express";
import { webAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as controller from "./project.controller.js";
import { CreateProjectSchema, ProjectParamsSchema, UpdateProjectSchema } from "./project.schema.js";

export const projectRoutes = Router();

projectRoutes.use(webAuthMiddleware);

projectRoutes.get("/", controller.list);
projectRoutes.post("/", validateRequest("body", CreateProjectSchema), controller.create);
projectRoutes.get("/:projectId", validateRequest("params", ProjectParamsSchema), controller.get);
projectRoutes.patch(
  "/:projectId",
  validateRequest("params", ProjectParamsSchema),
  validateRequest("body", UpdateProjectSchema),
  controller.update
);
projectRoutes.delete("/:projectId", validateRequest("params", ProjectParamsSchema), controller.remove);
