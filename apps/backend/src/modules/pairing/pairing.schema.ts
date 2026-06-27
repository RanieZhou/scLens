import { z } from "zod";

export const CreatePairingSessionSchema = z.object({
  runnerId: z.string().min(1).max(100),
  pairCodeHash: z.string().length(64),
  pairNonce: z.string().min(1).max(128),
  runnerSecretHash: z.string().length(64),
  expiresIn: z.number().int().min(300).max(600).optional()
});

export const PairRunnerSchema = z.object({
  pairCode: z.string().min(1).max(20)
});

export const PairingSessionParamsSchema = z.object({
  pairingSessionId: z.string().uuid()
});

export const ProjectParamsSchema = z.object({
  projectId: z.string().uuid()
});
