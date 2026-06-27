import { createReadStream } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { sendError, sendSuccess } from "../../utils/response.js";
import * as resultService from "./result.service.js";
import { ResultFileMetaSchema, isAllowedFileName } from "./result.schema.js";
import { ResultFileTypeSchema } from "@sclens/shared-types";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export const uploadMiddleware = upload.single("file");

export async function uploadResult(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) { sendError(res, 400, "VALIDATION_ERROR", "Missing file field"); return; }

    if (!isAllowedFileName(file.originalname)) {
      sendError(res, 400, "UNSUPPORTED_FILE_TYPE", "File type not allowed");
      return;
    }

    const metaParsed = ResultFileMetaSchema.safeParse(req.body);
    if (!metaParsed.success) { sendError(res, 400, "VALIDATION_ERROR", "Missing fileType field"); return; }

    const { taskId } = req.params as { taskId: string };
    const { Readable } = await import("node:stream");
    const stream = Readable.from(file.buffer);

    await resultService.saveResultFile(taskId, metaParsed.data.fileType, file.originalname, stream, file.size);
    sendSuccess(res, { uploaded: true });
  } catch (err) {
    next(err);
  }
}

export async function listResults(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params as { taskId: string };
    const files = await resultService.listResultFiles(taskId);
    sendSuccess(res, files);
  } catch (err) {
    next(err);
  }
}

export async function downloadResult(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId, resultFileId } = req.params as { taskId: string; resultFileId: string };
    const { prisma } = await import("../../db/prisma.js");
    const rf = await prisma.resultFile.findFirst({ where: { id: resultFileId, taskId } });
    if (!rf) { sendError(res, 404, "NOT_FOUND", "Result file not found"); return; }

    const filePath = resultService.getResultFilePath(rf.objectKey);
    const ext = rf.fileName.split(".").pop()?.toLowerCase() ?? "";
    const typeHeader =
      rf.fileType === "report_html" ? "text/html; charset=utf-8"
      : ext === "png"  ? "image/png"
      : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
      : ext === "svg"  ? "image/svg+xml"
      : ext === "csv"  ? "text/csv"
      : ext === "json" ? "application/json"
      : "application/octet-stream";
    res.setHeader("Content-Type", typeHeader);
    res.setHeader("Content-Disposition", `inline; filename="${rf.fileName}"`);
    createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
}
