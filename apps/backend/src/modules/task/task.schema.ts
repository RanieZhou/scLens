import { PipelineSchema, TaskStatusSchema } from "@sclens/shared-types";
import { z } from "zod";

export const CreateTaskSchema = z.object({
  name: z.string().min(1).max(200),
  pipeline: PipelineSchema,
  runnerId: z.string().min(1),
  config: z.record(z.string(), z.unknown())
});

export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusSchema,
  progress: z.number().int().min(0).max(100).optional(),
  currentStage: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
  errorMessage: z.string().max(2000).optional()
});

export const AddLogSchema = z.object({
  level: z.enum(["info", "warn", "error"] as const),
  stage: z.string().max(100).optional(),
  message: z.string(),
  timestamp: z.string().optional()
});

export const TaskParamsSchema = z.object({
  taskId: z.string().uuid()
});

export const ProjectTaskParamsSchema = z.object({
  projectId: z.string().uuid()
});

export const RunnerParamsSchema = z.object({
  runnerId: z.string().min(1)
});
