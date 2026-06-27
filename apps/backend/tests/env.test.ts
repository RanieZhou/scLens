import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/config/env.js";

describe("backend env", () => {
  it("parses required and default environment values with Zod", () => {
    const env = parseEnv({
      DATABASE_URL: "mysql://sclens:sclens@localhost:3306/sclens",
      RUNNER_TOKEN_SECRET: "runner-secret"
    });

    expect(env.PORT).toBe(3001);
    expect(env.PAIR_CODE_TTL_SECONDS).toBe(600);
    expect(env.DATABASE_URL).toContain("mysql://");
  });

  it("rejects missing required secrets", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://localhost:3306/sclens" })).toThrow();
  });
});
