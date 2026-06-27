import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { verifyRunnerToken } from "../../utils/token.js";
import type { z } from "zod";
import type { HeartbeatSchema, UploadProfileSchema } from "./runner.schema.js";

export function verifyRunnerBinding(token: string, runnerId: string): boolean {
  return verifyRunnerToken(token) === runnerId;
}

export async function heartbeat(runnerId: string, data: z.infer<typeof HeartbeatSchema>) {
  return prisma.runner.update({
    where: { id: runnerId },
    data: { status: data.status, lastSeenAt: new Date() }
  });
}

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function uploadProfile(runnerId: string, data: z.infer<typeof UploadProfileSchema>) {
  await prisma.runner.update({
    where: { id: runnerId },
    data: {
      os: data.os ?? null,
      arch: data.arch ?? null,
      status: "online",
      lastSeenAt: new Date()
    }
  });

  const profileData = {
    hostname: data.hostname ?? null,
    cpuInfo: toJson(data.cpuInfo),
    memoryInfo: toJson(data.memoryInfo),
    gpuInfo: toJson(data.gpuInfo),
    diskInfo: toJson(data.diskInfo),
    pythonEnvs: toJson(data.pythonEnvs)
  };

  return prisma.runnerProfile.upsert({
    where: { runnerId },
    create: { runnerId, ...profileData },
    update: profileData
  });
}

export async function getProjectRunners(projectId: string) {
  const bindings = await prisma.projectRunnerBinding.findMany({
    where: { projectId, status: "active" },
    include: { runner: { include: { profile: true } } }
  });
  return bindings.map((b) => ({ ...b.runner, profile: b.runner.profile }));
}

export async function unbindRunner(projectId: string, runnerId: string) {
  return prisma.projectRunnerBinding.update({
    where: { projectId_runnerId: { projectId, runnerId } },
    data: { status: "inactive" }
  });
}
