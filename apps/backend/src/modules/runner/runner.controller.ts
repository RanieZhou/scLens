import type { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils/response.js";
import * as runnerService from "./runner.service.js";

export async function heartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = res.locals.runnerToken as string;
    const { runnerId } = req.params as { runnerId: string };
    if (!runnerService.verifyRunnerBinding(token, runnerId)) {
      sendError(res, 403, "FORBIDDEN", "Runner token mismatch");
      return;
    }
    await runnerService.heartbeat(runnerId, req.body);
    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

export async function uploadProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = res.locals.runnerToken as string;
    const { runnerId } = req.params as { runnerId: string };
    if (!runnerService.verifyRunnerBinding(token, runnerId)) {
      sendError(res, 403, "FORBIDDEN", "Runner token mismatch");
      return;
    }
    const profile = await runnerService.uploadProfile(runnerId, req.body);
    sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
}

export async function getProjectRunners(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params as { projectId: string };
    const runners = await runnerService.getProjectRunners(projectId);
    sendSuccess(res, runners);
  } catch (err) {
    next(err);
  }
}

export async function unbindRunner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, runnerId } = req.params as { projectId: string; runnerId: string };
    await runnerService.unbindRunner(projectId, runnerId);
    sendSuccess(res, { unbound: true });
  } catch (err) {
    next(err);
  }
}
