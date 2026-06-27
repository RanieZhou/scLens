import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function webAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!env.WEB_ACCESS_TOKEN) {
    next();
    return;
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "req_unknown";
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing auth token" }, requestId });
    return;
  }
  const token = header.slice(7);
  if (token !== env.WEB_ACCESS_TOKEN) {
    const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "req_unknown";
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid auth token" }, requestId });
    return;
  }
  next();
}

export function runnerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "req_unknown";
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing runner token" }, requestId });
    return;
  }
  res.locals.runnerToken = header.slice(7);
  next();
}
