import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

export type PairingStatus = "idle" | "waiting" | "paired" | "expired" | "error";

export interface PairingState {
  status: PairingStatus;
  pairCode: string | null;
  expiresIn: number;
  error: string | null;
}

export function usePairing(onPaired: () => void) {
  const [state, setState] = useState<PairingState>({
    status: "idle",
    pairCode: null,
    expiresIn: 0,
    error: null
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const startSession = useCallback(async () => {
    stopPolling();
    setState({ status: "waiting", pairCode: null, expiresIn: 600, error: null });
    try {
      const result = await invoke<{ pair_code: string; session_id: string; expires_in: number }>(
        "create_pairing_session"
      );
      setState((s) => ({ ...s, pairCode: result.pair_code, expiresIn: result.expires_in }));
      startCountdown(result.expires_in);
      startPoll(result.session_id);
    } catch (e) {
      setState((s) => ({ ...s, status: "error", error: String(e) }));
    }
  }, [stopPolling]); // eslint-disable-line

  function startCountdown(seconds: number) {
    let remaining = seconds;
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      remaining--;
      setState((s) => ({ ...s, expiresIn: remaining }));
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        setState((s) => s.status === "waiting" ? { ...s, status: "expired" } : s);
        stopPolling();
      }
    }, 1000);
  }

  function startPoll(sessionId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await invoke<{ status: string }>("poll_pairing_status", { sessionId });
        if (r.status === "PAIRED") {
          setState((s) => ({ ...s, status: "paired" }));
          stopPolling();
          invoke("upload_profile").catch(console.error);
          onPaired();
        } else if (r.status === "EXPIRED" || r.status === "FAILED") {
          setState((s) => ({ ...s, status: "expired" }));
          stopPolling();
        }
      } catch { /* network glitch – keep polling */ }
    }, 3000);
  }

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { state, startSession };
}
