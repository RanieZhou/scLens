import { prisma } from "../../db/prisma.js";
import type { z } from "zod";
import type { CreateProjectSchema, UpdateProjectSchema } from "./project.schema.js";

export async function listProjects() {
  return prisma.project.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getProject(projectId: string) {
  return prisma.project.findUnique({ where: { id: projectId } });
}

export async function createProject(data: z.infer<typeof CreateProjectSchema>) {
  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description ?? null
    }
  });
}

export async function updateProject(projectId: string, data: z.infer<typeof UpdateProjectSchema>) {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description ?? null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {})
    }
  });
}

export async function deleteProject(projectId: string) {
  return prisma.project.delete({ where: { id: projectId } });
}
