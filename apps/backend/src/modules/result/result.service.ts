import { createHash } from "node:crypto";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import type { ResultFileType } from "@sclens/shared-types";

export async function saveResultFile(
  taskId: string,
  fileType: ResultFileType,
  fileName: string,
  stream: Readable,
  sizeBytes: number
): Promise<string> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  if (!task) throw new Error("Task not found");

  const baseDir = join(env.STORAGE_ROOT, "projects", task.projectId, "tasks", taskId);
  const objectKey = `projects/${task.projectId}/tasks/${taskId}/${fileName}`;
  const dest = normalize(join(env.STORAGE_ROOT, objectKey));
  const resolvedBase = normalize(baseDir);

  // Path traversal guard
  if (!dest.startsWith(resolvedBase + sep) && dest !== resolvedBase) {
    throw new Error("Invalid fileName: path traversal detected");
  }

  mkdirSync(dirname(dest), { recursive: true });

  const hash = createHash("sha256");
  const writeStream = createWriteStream(dest);

  await pipeline(
    stream,
    async function* (source) {
      for await (const chunk of source) {
        hash.update(chunk as Buffer);
        yield chunk;
      }
    },
    writeStream
  );

  const checksum = `sha256:${hash.digest("hex")}`;

  await prisma.resultFile.create({
    data: {
      taskId,
      fileType,
      fileName,
      objectKey,
      sizeBytes: BigInt(sizeBytes),
      checksum
    }
  });

  return objectKey;
}

export async function listResultFiles(taskId: string) {
  const files = await prisma.resultFile.findMany({ where: { taskId }, orderBy: { createdAt: "asc" } });
  // Prisma returns BigInt for BIGINT columns; convert to number for JSON serialization
  return files.map((f) => ({ ...f, sizeBytes: Number(f.sizeBytes) }));
}

export function getResultFilePath(objectKey: string): string {
  return join(env.STORAGE_ROOT, objectKey);
}
