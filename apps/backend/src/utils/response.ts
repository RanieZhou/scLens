import type { Response } from "express";

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "req_unknown";
  res.status(status).json({ success: true, data, requestId });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "req_unknown";
  const error: Record<string, unknown> = { code, message };
  if (details !== undefined) error.details = details;
  res.status(status).json({ success: false, error, requestId });
}
