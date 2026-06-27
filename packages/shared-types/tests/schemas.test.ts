import { describe, expect, it } from "vitest";
import {
  ApiErrorResponseSchema,
  PipelineSchema,
  TaskStatusSchema,
  createSuccessResponseSchema
} from "../src/index.js";
import { z } from "zod";

describe("shared API schemas", () => {
  it("accepts only documented task statuses", () => {
    expect(TaskStatusSchema.parse("RUNNING")).toBe("RUNNING");
    expect(() => TaskStatusSchema.parse("DONE")).toThrow();
  });

  it("accepts only documented pipelines", () => {
    expect(PipelineSchema.parse("sc_profile_basic")).toBe("sc_profile_basic");
    expect(() => PipelineSchema.parse("shell_command")).toThrow();
  });

  it("validates common API response envelopes", () => {
    const SuccessSchema = createSuccessResponseSchema(z.object({ ok: z.literal(true) }));
    expect(SuccessSchema.parse({ success: true, data: { ok: true }, requestId: "req_1" }).data.ok).toBe(true);
    expect(ApiErrorResponseSchema.parse({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      requestId: "req_1"
    }).error.code).toBe("VALIDATION_ERROR");
  });
});
