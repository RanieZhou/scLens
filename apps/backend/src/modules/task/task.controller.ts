import type { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils/response.js";
import { verifyRunnerToken } from "../../utils/token.js";
import * as taskService from "./task.service.js";

export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params as { projectId: string };
    const task = await taskService.createTask(projectId, req.body);
    sendSuccess(res, task, 201);
  } catch (err) {
    next(err);
  }
}

export async function listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params as { projectId: string };
    const tasks = await taskService.listProjectTasks(projectId);
    sendSuccess(res, tasks);
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params as { taskId: string };
    const task = await taskService.getTask(taskId);
    if (!task) { sendError(res, 404, "NOT_FOUND", "Task not found"); return; }
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
}

export async function getPendingTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = res.locals.runnerToken as string;
    const { runnerId } = req.params as { runnerId: string };
    if (verifyRunnerToken(token) !== runnerId) {
      sendError(res, 403, "FORBIDDEN", "Runner token mismatch");
      return;
    }
    const tasks = await taskService.getPendingTasksForRunner(runnerId);
    sendSuccess(res, tasks);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params as { taskId: string };
    const result = await taskService.updateTaskStatus(taskId, req.body);
    if (!result.ok) {
      if (result.error === "NOT_FOUND") { sendError(res, 404, "NOT_FOUND", "Task not found"); return; }
      sendError(res, 409, "STATE_CONFLICT", "Invalid status transition");
      return;
    }
    sendSuccess(res, { updated: true });
  } catch (err) {
    next(err);
  }
}

export async function addLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params as { taskId: string };
    await taskService.addLog(taskId, req.body);
    sendSuccess(res, { logged: true });
  } catch (err) {
    next(err);
  }
}

export async function getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params as { taskId: string };
    const logs = await taskService.getTaskLogs(taskId);
    sendSuccess(res, logs);
  } catch (err) {
    next(err);
  }
}
