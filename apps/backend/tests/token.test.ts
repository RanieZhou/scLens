import { describe, expect, it } from "vitest";
import { signRunnerToken, verifyRunnerToken } from "../src/utils/token.js";

describe("runner token", () => {
  it("signs and verifies a token for a given runnerId", () => {
    const id = "runner-abc-123";
    const token = signRunnerToken(id);
    expect(verifyRunnerToken(token)).toBe(id);
  });

  it("returns null for a tampered token", () => {
    const token = signRunnerToken("runner-xyz");
    const tampered = token.slice(0, -4) + "aaaa";
    expect(verifyRunnerToken(tampered)).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(verifyRunnerToken("not-a-token")).toBeNull();
    expect(verifyRunnerToken("")).toBeNull();
  });
});
