import { z } from "zod";

export const RunnerParamsSchema = z.object({
  runnerId: z.string().min(1)
});

export const ProjectRunnerParamsSchema = z.object({
  projectId: z.string().uuid(),
  runnerId: z.string().min(1)
});

export const HeartbeatSchema = z.object({
  status: z.enum(["online", "busy", "error"] as const)
});

export const PythonEnvSchema = z.object({
  envId: z.string().min(1),
  type: z.enum(["conda", "venv", "system", "manual"] as const),
  name: z.string().optional(),
  pythonPathMasked: z.string().optional(),
  pythonVersion: z.string().optional(),
  packages: z.record(z.string(), z.string()).optional(),
  status: z.enum(["READY", "MISSING_PACKAGES", "PYTHON_VERSION_UNSUPPORTED", "BROKEN", "UNKNOWN"] as const),
  missing: z.array(z.string()).optional(),
  recommended: z.boolean().optional()
});

export const UploadProfileSchema = z.object({
  hostname: z.string().optional(),
  os: z.string().optional(),
  arch: z.string().optional(),
  cpuInfo: z.object({
    model: z.string().optional(),
    physicalCores: z.number().int().optional(),
    logicalCores: z.number().int().optional()
  }).optional(),
  memoryInfo: z.object({
    totalGb: z.number().optional(),
    availableGb: z.number().optional()
  }).optional(),
  gpuInfo: z.array(z.object({
    vendor: z.string().optional(),
    name: z.string().optional(),
    vramGb: z.number().optional(),
    cudaAvailable: z.boolean().optional()
  })).optional(),
  diskInfo: z.object({
    freeGb: z.number().optional()
  }).optional(),
  pythonEnvs: z.array(PythonEnvSchema).optional()
});
