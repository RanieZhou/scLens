import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["active", "archived"]).optional()
});

export const ProjectParamsSchema = z.object({
  projectId: z.string().uuid()
});
