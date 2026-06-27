import type { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils/response.js";
import * as pairingService from "./pairing.service.js";

export async function createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pairingService.createPairingSession(req.body);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function getSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const runnerSecret = req.headers["x-runner-secret"];
    if (typeof runnerSecret !== "string" || !runnerSecret) {
      sendError(res, 403, "FORBIDDEN", "Missing X-Runner-Secret header");
      return;
    }
    const { pairingSessionId } = req.params as { pairingSessionId: string };
    const result = await pairingService.getPairingSessionStatus(pairingSessionId, runnerSecret);
    if (result.kind === "NOT_FOUND") { sendError(res, 404, "NOT_FOUND", "Pairing session not found"); return; }
    if (result.kind === "FORBIDDEN") { sendError(res, 403, "FORBIDDEN", "Invalid runner secret"); return; }
    sendSuccess(res, { status: result.status, ...(result.runnerAccessToken ? { runnerAccessToken: result.runnerAccessToken } : {}) });
  } catch (err) {
    next(err);
  }
}

export async function pairRunner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params as { projectId: string };
    const result = await pairingService.pairRunner(projectId, req.body.pairCode);
    if (!result.ok) {
      if (result.error === "NOT_FOUND") { sendError(res, 404, "NOT_FOUND", "Project not found"); return; }
      if (result.error === "EXPIRED") { sendError(res, 410, "PAIR_CODE_EXPIRED", "Pair code has expired"); return; }
      if (result.error === "ATTEMPT_LIMIT") { sendError(res, 429, "PAIR_CODE_ATTEMPT_LIMIT", "Too many attempts"); return; }
      sendError(res, 400, "PAIR_CODE_INVALID", "Invalid pair code");
      return;
    }
    sendSuccess(res, { status: "PAIRED", runnerId: result.runnerId });
  } catch (err) {
    next(err);
  }
}
