import type { ResultFile, Task, TaskLog } from "@sclens/api-client";
import { api } from "./client.js";

export const tasksApi = {
  get: (taskId: string) => api.get<Task>(`/tasks/${taskId}`),
  getLogs: (taskId: string) => api.get<TaskLog[]>(`/tasks/${taskId}/logs`),
  getResults: (taskId: string) => api.get<ResultFile[]>(`/tasks/${taskId}/results`),
  resultUrl: (taskId: string, resultFileId: string) =>
    `/api/tasks/${taskId}/results/${resultFileId}`
};
