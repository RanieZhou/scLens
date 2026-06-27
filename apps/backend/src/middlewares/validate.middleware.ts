import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type RequestTarget = "body" | "params" | "query";

export function validateRequest(target: RequestTarget, schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[target]);
    if (!parsed.success) {
      const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "req_unknown";
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request input",
          details: parsed.error.flatten()
        },
        requestId
      });
      return;
    }

    Object.defineProperty(req, target, {
      value: parsed.data,
      configurable: true,
      enumerable: true,
      writable: true
    });
    next();
  };
}
