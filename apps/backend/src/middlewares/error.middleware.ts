import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "req_unknown";

  // Prisma record-not-found
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Resource not found" }, requestId });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message }, requestId });
};
