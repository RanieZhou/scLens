const BASE = "/api";
const TOKEN = import.meta.env.VITE_WEB_ACCESS_TOKEN as string | undefined;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (TOKEN) headers["Authorization"] = `Bearer ${TOKEN}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  const json = await res.json() as { success: boolean; data?: T; error?: { code: string; message: string } };
  if (!json.success) throw new Error(json.error?.message ?? "Request failed");
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" })
};
