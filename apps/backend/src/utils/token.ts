import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export function signRunnerToken(runnerId: string): string {
  const payload = `${runnerId}.${Date.now()}`;
  const sig = createHmac("sha256", env.RUNNER_TOKEN_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyRunnerToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;
    const runnerId = parts[0];
    const ts = parts[1];
    const sig = parts[2];
    if (!runnerId || !ts || !sig) return null;
    const payload = `${runnerId}.${ts}`;
    const expected = createHmac("sha256", env.RUNNER_TOKEN_SECRET).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    return runnerId;
  } catch {
    return null;
  }
}

export function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}
