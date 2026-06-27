import { describe, expect, it } from "vitest";
import { TASK_STATE_MACHINE, isValidTransition } from "../src/modules/task/task.state-machine.js";
import type { TaskStatus } from "@sclens/shared-types";

describe("task state machine", () => {
  it("allows CREATED → WAITING_FOR_LOCAL_RUNNER", () => {
    expect(isValidTransition("CREATED", "WAITING_FOR_LOCAL_RUNNER")).toBe(true);
  });

  it("allows RUNNING → FAILED", () => {
    expect(isValidTransition("RUNNING", "FAILED")).toBe(true);
  });

  it("allows any non-terminal → CANCELLED", () => {
    const nonTerminal: TaskStatus[] = [
      "CREATED", "WAITING_FOR_LOCAL_RUNNER", "RUNNER_CONNECTED",
      "WAITING_FOR_LOCAL_FILE", "ENV_CHECKING", "ENV_READY",
      "INSTALLING_DEPENDENCIES", "QUEUED_LOCAL", "RUNNING", "UPLOADING_RESULTS"
    ];
    for (const s of nonTerminal) {
      expect(isValidTransition(s, "CANCELLED")).toBe(true);
    }
  });

  it("rejects CREATED → COMPLETED", () => {
    expect(isValidTransition("CREATED", "COMPLETED")).toBe(false);
  });

  it("rejects FAILED → RUNNING", () => {
    expect(isValidTransition("FAILED", "RUNNING")).toBe(false);
  });

  it("rejects all transitions from terminal states", () => {
    const terminals: TaskStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];
    const all = Object.keys(TASK_STATE_MACHINE) as TaskStatus[];
    for (const from of terminals) {
      for (const to of all) {
        expect(isValidTransition(from, to)).toBe(false);
      }
    }
  });
});
