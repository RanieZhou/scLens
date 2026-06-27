import type { Project } from "@sclens/api-client";
import { api } from "./client.js";

export const projectsApi = {
  list: () => api.get<Project[]>("/projects"),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post<Project>("/projects", data),
  update: (id: string, data: Partial<{ name: string; description: string; status: string }>) =>
    api.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/projects/${id}`),
  pairRunner: (projectId: string, pairCode: string) =>
    api.post<{ status: string; runnerId: string }>(`/projects/${projectId}/pair-runner`, { pairCode }),
  getRunners: (projectId: string) => api.get<unknown[]>(`/projects/${projectId}/runners`),
  getTasks: (projectId: string) => api.get<unknown[]>(`/projects/${projectId}/tasks`),
  createTask: (projectId: string, data: { name: string; pipeline: string; runnerId: string; config: unknown }) =>
    api.post<unknown>(`/projects/${projectId}/tasks`, data)
};
