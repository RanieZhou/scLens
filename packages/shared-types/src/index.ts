import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "CREATED",
  "WAITING_FOR_LOCAL_RUNNER",
  "RUNNER_CONNECTED",
  "WAITING_FOR_LOCAL_FILE",
  "ENV_CHECKING",
  "ENV_READY",
  "INSTALLING_DEPENDENCIES",
  "QUEUED_LOCAL",
  "RUNNING",
  "UPLOADING_RESULTS",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const RunnerStatusSchema = z.enum(["offline", "online", "paired", "busy", "error"]);

export type RunnerStatus = z.infer<typeof RunnerStatusSchema>;

export const PairingStatusSchema = z.enum(["WAITING", "PAIRED", "EXPIRED", "FAILED"]);

export type PairingStatus = z.infer<typeof PairingStatusSchema>;

export const PipelineSchema = z.enum(["sc_profile_basic", "sc_standard_analysis"]);

export type Pipeline = z.infer<typeof PipelineSchema>;

export const ResultFileTypeSchema = z.enum([
  "summary_json",
  "report_html",
  "figure",
  "table",
  "log",
  "provenance",
  "embedding"
]);

export type ResultFileType = z.infer<typeof ResultFileTypeSchema>;

export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "PAIR_CODE_EXPIRED",
  "PAIR_CODE_INVALID",
  "PAIR_CODE_ATTEMPT_LIMIT",
  "STATE_CONFLICT",
  "UNSUPPORTED_FILE_TYPE",
  "UPLOAD_REJECTED",
  "INTERNAL_ERROR"
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1),
  details: z.unknown().optional()
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
  requestId: z.string().min(1)
});

export function createSuccessResponseSchema<TSchema extends z.ZodType>(dataSchema: TSchema) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    requestId: z.string().min(1)
  });
}

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
