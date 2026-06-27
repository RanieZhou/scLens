import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma to avoid real DB in unit tests
vi.mock("../src/db/prisma.js", () => ({
  prisma: {
    runner: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    runnerPairingSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    project: { findUnique: vi.fn() },
    projectRunnerBinding: { upsert: vi.fn() },
    $transaction: vi.fn()
  }
}));

vi.mock("../src/config/env.js", () => ({
  env: {
    PAIR_CODE_TTL_SECONDS: 600,
    PAIR_CODE_MAX_ATTEMPTS: 5,
    RUNNER_TOKEN_SECRET: "test-secret"
  }
}));

import { createPairingSession, pairRunner } from "../src/modules/pairing/pairing.service.js";
import { prisma } from "../src/db/prisma.js";
import { createHash } from "node:crypto";

function sha256(s: string) { return createHash("sha256").update(s).digest("hex"); }

const mockPrisma = prisma as unknown as {
  runner: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  runnerPairingSession: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  project: { findUnique: ReturnType<typeof vi.fn> };
  projectRunnerBinding: { upsert: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => { vi.clearAllMocks(); });

describe("createPairingSession", () => {
  it("creates a pairing session and returns sessionId", async () => {
    mockPrisma.runner.findUnique.mockResolvedValue({ id: "r1" });
    const sessionId = "sess-1";
    const expiresAt = new Date(Date.now() + 600_000);
    mockPrisma.runnerPairingSession.create.mockResolvedValue({ id: sessionId, status: "WAITING", expiresAt });

    const result = await createPairingSession({
      runnerId: "r1",
      pairCodeHash: "a".repeat(64),
      pairNonce: "nonce",
      runnerSecretHash: "b".repeat(64)
    });

    expect(result.pairingSessionId).toBe(sessionId);
    expect(result.status).toBe("WAITING");
  });
});

describe("pairRunner", () => {
  it("returns NOT_FOUND when project does not exist", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    const result = await pairRunner("proj-404", "CODE1234");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("NOT_FOUND");
  });

  it("returns INVALID when pairCode does not match any session", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "proj-1" });
    mockPrisma.runnerPairingSession.findMany.mockResolvedValue([]);
    mockPrisma.runnerPairingSession.findFirst.mockResolvedValue(null);
    const result = await pairRunner("proj-1", "WRONGCODE");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID");
  });

  it("matches correct pairCode and triggers transaction", async () => {
    const pairCode = "K7Q4M9XA";
    const nonce = "testnonce";
    const hash = sha256(pairCode + nonce);

    mockPrisma.project.findUnique.mockResolvedValue({ id: "proj-1" });
    mockPrisma.runnerPairingSession.findMany.mockResolvedValue([
      { id: "sess-1", runnerId: "r1", pairCodeHash: hash, pairNonce: nonce, attemptCount: 0, expiresAt: new Date(Date.now() + 600_000) }
    ]);
    mockPrisma.$transaction.mockResolvedValue([]);

    const result = await pairRunner("proj-1", pairCode);
    expect(result.ok).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });
});
