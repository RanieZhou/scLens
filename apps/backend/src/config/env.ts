import "dotenv/config";
import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  STORAGE_ROOT: z.string().min(1).default("./storage"),
  RUNNER_TOKEN_SECRET: z.string().min(1),
  WEB_ACCESS_TOKEN: optionalNonEmptyString,
  PAIR_CODE_TTL_SECONDS: z.coerce.number().int().min(300).max(600).default(600),
  PAIR_CODE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
});

export type BackendEnv = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv): BackendEnv {
  return envSchema.parse(input);
}

export const env = parseEnv(process.env);
