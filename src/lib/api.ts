import type { PipelineApi } from "./contracts";
import { demoApi } from "./demoApi";
import { httpHref } from "./artifacts";
import { LOG_PREVIEW_BYTES, readLogPreview } from "./logPreview";

export * from "./contracts";

export const isDemo = localStorage.getItem("tee-mode") !== "live";

async function request<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const payload: unknown = await response.json().catch(() => undefined);
  const failure =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as { ok?: boolean; error?: unknown; detail?: unknown })
      : undefined;
  if (!response.ok || failure?.ok === false) {
    const message = [failure?.error, failure?.detail].find(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    throw new Error(message || `请求失败（HTTP ${response.status}）`);
  }
  if (!failure) {
    throw new Error(
      `接口未返回 JSON 对象（HTTP ${response.status}），请检查后端代理。`,
    );
  }
  return payload as T;
}

export const logUrl = (id: string, stage: string, download = false) => {
  const params = new URLSearchParams({ run: id, stage });
  if (download) params.set("download", "1");
  return `/api/log?${params}`;
};

const liveApi: PipelineApi = {
  me: () => request("/api/me"),
  runs: (query) => request("/api/runs" + query),
  detail: (id) => request("/api/status?run=" + encodeURIComponent(id)),
  devices: () => request("/api/devices"),
  configs: () => request("/api/configs"),
  config: (name) => request("/api/configs/" + encodeURIComponent(name)),
  submit: (body) => request("/api/tasks", body),
  remove: (id) => request("/api/delete", { run: id }),
  logPreview: async (id, stage, options) => {
    const response = await fetch(httpHref(options?.url) ?? logUrl(id, stage), {
      headers: { Range: `bytes=0-${LOG_PREVIEW_BYTES - 1}` },
      signal: options?.signal,
    });
    if (response.status === 416 && response.headers.get("Content-Range") === "bytes */0") {
      return { text: "", truncated: false };
    }
    if (!response.ok) throw new Error(`日志加载失败（${response.status}）`);
    return readLogPreview(response);
  },
};

export const api = isDemo ? demoApi : liveApi;
export const duration = (seconds: number) =>
  seconds ? `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s` : "—";
