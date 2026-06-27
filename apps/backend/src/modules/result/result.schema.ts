import { ResultFileTypeSchema } from "@sclens/shared-types";
import { z } from "zod";

export const TaskParamsSchema = z.object({ taskId: z.string().uuid() });

export const ResultFileMetaSchema = z.object({
  fileType: ResultFileTypeSchema
});

const ALLOWED_EXTENSIONS = new Set([".json", ".html", ".png", ".svg", ".csv", ".tsv", ".parquet", ".log", ".txt"]);

export function isAllowedFileName(name: string): boolean {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return false;
  return ALLOWED_EXTENSIONS.has(name.slice(idx).toLowerCase());
}
