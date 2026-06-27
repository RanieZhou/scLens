import { Router } from "express";

export const healthRoutes = Router();

healthRoutes.get("/health", (_req, res) => {
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "req_unknown";
  res.json({
    success: true,
    data: {
      status: "ok"
    },
    requestId
  });
});
