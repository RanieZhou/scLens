import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { isValidTransition } from "./task.state-machine.js";
import type { TaskStatus } from "@sclens/shared-types";
import type { z } from "zod";
import type { AddLogSchema, CreateTaskSchema, UpdateTaskStatusSchema } from "./task.schema.js";

export async function createTask(projectId: string, data: z.infer<typeof CreateTaskSchema>) {
  const task = await prisma.task.create({
    data: {
      projectId,
      runnerId: data.runnerId,
      name: data.name,
      pipeline: data.pipeline,
      status: "CREATED",
      config: data.config as Prisma.InputJsonValue
    }
  });
  // Backend advances to WAITING_FOR_LOCAL_RUNNER immediately
  return prisma.task.update({
    where: { id: task.id },
    data: { status: "WAITING_FOR_LOCAL_RUNNER" }
  });
}

export async function listProjectTasks(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" }
  });
}

export async function getTask(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId } });
}

export async function getPendingTasksForRunner(runnerId: string) {
  const task = await prisma.task.findFirst({
    where: { runnerId, status: "WAITING_FOR_LOCAL_RUNNER" },
    orderBy: { createdAt: "asc" }
  });
  if (!task) return [];
  // Mark as RUNNER_CONNECTED
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status: "RUNNER_CONNECTED" }
  });
  return [updated];
}

export type UpdateStatusError = "NOT_FOUND" | "INVALID_TRANSITION";

export async function updateTaskStatus(
  taskId: string,
  data: z.infer<typeof UpdateTaskStatusSchema>
): Promise<{ ok: true } | { ok: false; error: UpdateStatusError }> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "NOT_FOUND" };

  if (!isValidTransition(task.status as TaskStatus, data.status)) {
    return { ok: false, error: "INVALID_TRANSITION" };
  }

  const now = new Date();
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: data.status,
      ...(data.progress !== undefined ? { progress: data.progress } : {}),
      ...(data.currentStage !== undefined ? { currentStage: data.currentStage } : {}),
      ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
      ...(data.status === "RUNNING" && !task.startedAt ? { startedAt: now } : {}),
      ...(["COMPLETED", "FAILED", "CANCELLED"].includes(data.status) ? { finishedAt: now } : {})
    }
  });

  return { ok: true };
}

export async function addLog(taskId: string, data: z.infer<typeof AddLogSchema>) {
  return prisma.taskLog.create({
    data: {
      taskId,
      level: data.level,
      stage: data.stage ?? null,
      message: data.message
    }
  });
}

export async function getTaskLogs(taskId: string) {
  return prisma.taskLog.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    take: 200
  });
}
