export const stages = [
  "prepare",
  "build",
  "upload",
  "publish",
  "trigger",
  "flash",
  "test",
] as const;
export const stageLabels: Record<string, string> = {
  prepare: "环境准备",
  build: "编译构建",
  upload: "产物上传",
  publish: "版本发布",
  trigger: "触发任务",
  flash: "设备烧录",
  test: "自动测试",
};
export type Status =
  | "running"
  | "success"
  | "failed"
  | "timeout"
  | "pending"
  | "suspended"
  | "skipped"
  | "unknown";
export interface Artifact {
  name: string;
  size?: string | number;
  url?: string;
  download?: string;
  path?: string;
}
export interface Stage {
  name: string;
  status: Status;
  duration?: number;
  error?: string;
  params?: unknown;
  log_tail?: string;
  log_url?: string;
  log_download?: string;
  artifacts?: Artifact[];
}
export interface Run {
  run_id: string;
  verdict: Status;
  current_stage: string;
  progress: { done: number; total: number };
  branch: string;
  platform: string;
  task: string;
  change_id?: string;
  sn?: string;
  owner?: string;
  duration: number;
  created_at?: string;
  key_artifact?: string;
  test_summary?: Record<string, number> | null;
  stages?: Stage[];
}
export interface Detail {
  run_id: string;
  run_info: Run;
  stages: Stage[];
  manifest: unknown;
  is_running: boolean;
  source_config?: unknown;
}
export interface Device {
  sn: string;
  state: string;
  raw_state: string;
  busy: boolean;
  busy_by: string;
  busy_stage: string;
  uncertain: boolean;
}
export interface Config {
  name: string;
  label: string;
}
export interface ConfigDetail {
  editable: {
    root_mr: string;
    sn: string[];
    test_profile: string;
    functions: string[];
    remark: string;
  };
  stages: string[];
  readonly: Record<string, unknown>;
  test_profiles: string[];
  profile_details: Record<string, { functions: string[] }>;
}
export const isDemo = localStorage.getItem("tee-mode") !== "live";
const fixtureRuns: Run[] = Array.from({ length: 8 }, (_, i) => ({
  run_id: `run-20261114-${String(8 - i).padStart(3, "0")}`,
  verdict: (
    [
      "running",
      "success",
      "success",
      "failed",
      "pending",
      "success",
      "timeout",
      "success",
    ] as Status[]
  )[i],
  current_stage:
    i === 0 ? "test" : i === 3 ? "build" : i === 4 ? "prepare" : "test",
  progress: {
    done: i === 0 || i === 6 ? 6 : i === 3 ? 1 : i === 4 ? 0 : 7,
    total: 7,
  },
  branch: "br-****",
  platform: i % 3 === 0 ? "chd" : "platform-****",
  task: "task-****",
  change_id: "I****",
  sn: "SN-****0817",
  owner: i % 3 === 0 ? "user-****" : "user-****02",
  duration: [754, 1128, 946, 163, 0, 1025, 1800, 873][i],
  created_at: `2026-11-14 ${String(14 - i).padStart(2, "0")}:24:08`,
  key_artifact: i === 4 ? "" : "pkg-****.zip",
  test_summary:
    i === 0
      ? { passed: 42, failed: 0, total: 56 }
      : i === 1
        ? { passed: 56, failed: 0, total: 56 }
        : null,
}));
let runs = [...fixtureRuns];
const demoSkips: Record<string, string[]> = {};
export const demoDevices: Device[] = Array.from({ length: 6 }, (_, i) => ({
  sn: `SN-****${["0817", "0926", "1035", "1144", "1253", "1362"][i]}`,
  state: ["hdc", "hdc", "adb", "hdc", "fastboot", "offline"][i],
  raw_state: ["hdc", "hdc", "adb", "hdc", "fastboot", "offline"][i],
  busy: i === 0 || i === 2,
  busy_by: i === 0 ? runs[0].run_id : i === 2 ? runs[1].run_id : "",
  busy_stage: i === 0 ? "test" : i === 2 ? "flash" : "",
  uncertain: i === 4,
}));
const config: ConfigDetail = {
  editable: {
    root_mr: "",
    sn: [],
    test_profile: "profile-****",
    functions: ["TestSuite/****"],
    remark: "",
  },
  stages: [...stages],
  readonly: {
    task: "task-****",
    branch: "br-****",
    product: "product-****",
    docker_build: true,
  },
  test_profiles: ["profile-****", "profile-****-smoke"],
  profile_details: {
    "profile-****": { functions: ["TestSuite/****"] },
    "profile-****-smoke": { functions: ["TestSuite/****-smoke"] },
  },
};
export async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      `接口未返回 JSON（HTTP ${response.status}），请检查后端代理。`,
    );
  }
  if (!response.ok || data.ok === false)
    throw new Error(
      data.error || data.detail || `请求失败：${response.status}`,
    );
  return data;
}
export const api = {
  me: () =>
    isDemo
      ? Promise.resolve({ uid: "user-****", label: "user-****" })
      : request<{ uid: string; label: string }>("/api/me"),
  runs: (query: string) =>
    isDemo
      ? Promise.resolve({ items: runs })
      : request<{ items: Run[] }>("/api/runs" + query),
  detail: (id: string): Promise<Detail> => {
    if (!isDemo) return request("/api/status?run=" + encodeURIComponent(id));
    const run = runs.find((r) => r.run_id === id);
    if (!run) return Promise.reject(new Error("任务不存在"));
    return Promise.resolve({
      run_id: id,
      run_info: run,
      is_running: run.verdict === "running",
      manifest: { run_id: id, source_config: config.readonly, stages: stages },
      stages: stages.map((name, i) => ({
        name,
        status: demoSkips[id]?.includes(name)
          ? "skipped"
          : i < run.progress.done
            ? "success"
            : name === run.current_stage
              ? run.verdict
              : "pending",
        duration:
          i < run.progress.done ? [5, 284, 32, 12, 8, 121, 292][i] : undefined,
        error:
          run.verdict === "failed" && name === "build"
            ? "构建阶段执行失败，请查看阶段日志。"
            : "",
        params: { stage: name, config: "cfg-****.json" },
        log_tail: `[2026-11-14 10:00:00] [INFO] stage=${name} run_id=${id}\n[2026-11-14 10:00:01] [INFO] path=/****/****.log\n[2026-11-14 10:00:02] [INFO] sn=SN-****0817\n[2026-11-14 10:00:03] [INFO] result=****`,
        artifacts:
          name === "build" && run.progress.done > 1
            ? [{ name: "pkg-****.zip", size: "238 MB" }]
            : [],
      })),
    });
  },
  devices: () =>
    isDemo
      ? Promise.resolve({
          ssh_host: "WIN-HOST-1",
          server_time: "2026-11-14 14:36:42",
          devices: demoDevices,
          error: "",
        })
      : request<{
          ssh_host: string;
          server_time: string;
          devices: Device[];
          error: string;
        }>("/api/devices"),
  configs: () =>
    isDemo
      ? Promise.resolve({
          configs: [
            { name: "cfg-****.json", label: "cfg-****" },
            { name: "cfg-****-smoke.json", label: "cfg-****-smoke" },
          ],
        })
      : request<{ configs: Config[] }>("/api/configs"),
  config: (name: string) =>
    isDemo
      ? Promise.resolve(config)
      : request<ConfigDetail>("/api/configs/" + encodeURIComponent(name)),
  submit: async (body: unknown) => {
    if (!isDemo) return request<{ run_id: string }>("/api/tasks", body);
    const id = `run-20261114-${String(Date.now()).slice(-6)}`;
    const payload = body as {
      overrides: { sn: string[] };
      stages: { skip: string[] };
    };
    demoSkips[id] = payload.stages.skip;
    runs = [
      {
        ...fixtureRuns[4],
        run_id: id,
        owner: "user-****",
        sn: payload.overrides.sn.join(", ") || "—",
        created_at: new Date().toLocaleString("sv-SE"),
        current_stage:
          stages.find((s) => !payload.stages.skip.includes(s)) || "prepare",
      },
      ...runs,
    ];
    return { run_id: id };
  },
  remove: async (id: string) => {
    if (!isDemo) return request("/api/delete", { run: id });
    runs = runs.filter((r) => r.run_id !== id);
  },
  log: async (id: string, stage: string) => {
    if (isDemo)
      return `[演示日志 · 脱敏数据]\n${(await api.detail(id)).stages.find((s) => s.name === stage)?.log_tail}\n[2026-11-14 10:00:04] [INFO] result=****`;
    const r = await fetch(
      `/api/log?run=${encodeURIComponent(id)}&stage=${encodeURIComponent(stage)}`,
    );
    if (!r.ok) throw new Error(`日志加载失败（${r.status}）`);
    return r.text();
  },
};
export const duration = (seconds: number) =>
  seconds ? `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s` : "—";
