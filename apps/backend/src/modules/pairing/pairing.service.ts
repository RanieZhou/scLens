import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { signRunnerToken } from "../../utils/token.js";
import type { z } from "zod";
import type { CreatePairingSessionSchema } from "./pairing.schema.js";

export type PairError =
  | "NOT_FOUND"
  | "EXPIRED"
  | "ALREADY_PAIRED"
  | "ATTEMPT_LIMIT"
  | "INVALID";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function createPairingSession(data: z.infer<typeof CreatePairingSessionSchema>) {
  const ttl = data.expiresIn ?? env.PAIR_CODE_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  let runner = await prisma.runner.findUnique({ where: { id: data.runnerId } });
  if (!runner) {
    runner = await prisma.runner.create({
      data: { id: data.runnerId, status: "offline" }
    });
  }

  const session = await prisma.runnerPairingSession.create({
    data: {
      runnerId: data.runnerId,
      pairCodeHash: data.pairCodeHash,
      pairNonce: data.pairNonce,
      runnerSecretHash: data.runnerSecretHash,
      status: "WAITING",
      expiresAt
    }
  });

  return { pairingSessionId: session.id, status: "WAITING", expiresAt: session.expiresAt };
}

export async function getPairingSessionStatus(pairingSessionId: string, runnerSecret: string) {
  const session = await prisma.runnerPairingSession.findUnique({
    where: { id: pairingSessionId }
  });
  if (!session) return { kind: "NOT_FOUND" as const };

  const secretHash = sha256(runnerSecret);
  if (secretHash !== session.runnerSecretHash) return { kind: "FORBIDDEN" as const };

  if (session.status === "WAITING" && new Date() > session.expiresAt) {
    await prisma.runnerPairingSession.update({
      where: { id: pairingSessionId },
      data: { status: "EXPIRED" }
    });
    return { kind: "STATUS" as const, status: "EXPIRED" };
  }

  if (session.status !== "PAIRED") {
    return { kind: "STATUS" as const, status: session.status };
  }

  const token = signRunnerToken(session.runnerId);
  return { kind: "STATUS" as const, status: "PAIRED", runnerAccessToken: token };
}

export async function pairRunner(
  projectId: string,
  pairCode: string
): Promise<{ ok: true; runnerId: string } | { ok: false; error: PairError }> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false, error: "NOT_FOUND" };

  const now = new Date();
  const sessions = await prisma.runnerPairingSession.findMany({
    where: { status: "WAITING", expiresAt: { gt: now } }
  });

  for (const session of sessions) {
    if (session.attemptCount >= env.PAIR_CODE_MAX_ATTEMPTS) continue;

    const candidateHash = sha256(pairCode + session.pairNonce);
    if (candidateHash !== session.pairCodeHash) {
      await prisma.runnerPairingSession.update({
        where: { id: session.id },
        data: { attemptCount: { increment: 1 } }
      });
      continue;
    }

    await prisma.$transaction([
      prisma.runnerPairingSession.update({
        where: { id: session.id },
        data: { status: "PAIRED", pairedProjectId: projectId, pairedAt: now }
      }),
      prisma.projectRunnerBinding.upsert({
        where: { projectId_runnerId: { projectId, runnerId: session.runnerId } },
        create: { projectId, runnerId: session.runnerId, status: "active" },
        update: { status: "active" }
      }),
      prisma.runner.update({
        where: { id: session.runnerId },
        data: { status: "paired" }
      })
    ]);

    return { ok: true, runnerId: session.runnerId };
  }

  const exceeded = await prisma.runnerPairingSession.findFirst({
    where: { status: "WAITING", attemptCount: { gte: env.PAIR_CODE_MAX_ATTEMPTS } }
  });
  if (exceeded) return { ok: false, error: "ATTEMPT_LIMIT" };

  return { ok: false, error: "INVALID" };
}
