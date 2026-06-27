import { createSuccessResponseSchema } from "@sclens/shared-types";
import { z } from "zod";

export const ApiClientConfigSchema = z.object({
  baseUrl: z.string().url(),
  webAccessToken: z.string().min(1).optional()
});
export type ApiClientConfig = z.infer<typeof ApiClientConfigSchema>;

export const HealthResponseSchema = createSuccessResponseSchema(z.object({ status: z.literal("ok") }));
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ─── Project ─────────────────────────────────────────────────────────────────
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Project = z.infer<typeof ProjectSchema>;

// ─── Runner ──────────────────────────────────────────────────────────────────
export const PythonEnvSchema = z.object({
  envId: z.string(),
  type: z.enum(["conda", "venv", "system", "manual"] as const),
  name: z.string().optional(),
  pythonVersion: z.string().optional(),
  status: z.enum(["READY", "MISSING_PACKAGES", "PYTHON_VERSION_UNSUPPORTED", "BROKEN", "UNKNOWN"] as const),
  missing: z.array(z.string()).optional(),
  recommended: z.boolean().optional()
});
export type PythonEnv = z.infer<typeof PythonEnvSchema>;

export const RunnerSchema = z.object({
  id: z.string(),
  runnerName: z.string().nullable(),
  os: z.string().nullable(),
  arch: z.string().nullable(),
  status: z.string(),
  lastSeenAt: z.string().nullable(),
  profile: z.object({
    hostname: z.string().nullable(),
    cpuInfo: z.unknown(),
    memoryInfo: z.unknown(),
    gpuInfo: z.unknown(),
    diskInfo: z.unknown(),
    pythonEnvs: z.array(PythonEnvSchema).nullable()
  }).nullable()
});
export type Runner = z.infer<typeof RunnerSchema>;

// ─── Task ────────────────────────────────────────────────────────────────────
export const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  runnerId: z.string().nullable(),
  name: z.string(),
  pipeline: z.string(),
  status: z.string(),
  config: z.unknown(),
  progress: z.number(),
  currentStage: z.string().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Task = z.infer<typeof TaskSchema>;

// ─── Result file ─────────────────────────────────────────────────────────────
export const ResultFileSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  fileType: z.string(),
  fileName: z.string(),
  objectKey: z.string(),
  sizeBytes: z.union([z.string(), z.number()]).nullable(),
  checksum: z.string().nullable(),
  createdAt: z.string()
});
export type ResultFile = z.infer<typeof ResultFileSchema>;

// ─── Task log ────────────────────────────────────────────────────────────────
export const TaskLogSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  level: z.string(),
  stage: z.string().nullable(),
  message: z.string(),
  createdAt: z.string()
});
export type TaskLog = z.infer<typeof TaskLogSchema>;
