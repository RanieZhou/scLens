import type { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils/response.js";
import * as projectService from "./project.service.js";

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projects = await projectService.listProjects();
    sendSuccess(res, projects);
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params as { projectId: string };
    const project = await projectService.getProject(projectId);
    if (!project) { sendError(res, 404, "NOT_FOUND", "Project not found"); return; }
    sendSuccess(res, project);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await projectService.createProject(req.body);
    sendSuccess(res, project, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params as { projectId: string };
    const project = await projectService.updateProject(projectId, req.body);
    sendSuccess(res, project);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params as { projectId: string };
    await projectService.deleteProject(projectId);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
