import {
  stages,
  type ConfigDetail,
  type Detail,
  type Device,
  type PipelineApi,
  type Run,
  type Status,
} from "./contracts";

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
let nextRunNumber = fixtureRuns.length + 1;
const demoSkips = new Map<string, string[]>();
const demoDevices: Device[] = Array.from({ length: 6 }, (_, i) => ({
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
export const demoApi: PipelineApi = {
  me: async () => ({ uid: "user-****", label: "user-****" }),
  runs: async () => ({ items: runs }),
  detail: (id: string): Promise<Detail> => {
    const run = runs.find((r) => r.run_id === id);
    if (!run) return Promise.reject(new Error("任务不存在"));
    return Promise.resolve({
      run_id: id,
      run_info: run,
      is_running: run.verdict === "running",
      manifest: { run_id: id, source_config: config.readonly, stages: stages },
      stages: stages.map((name, i) => ({
        name,
        status: demoSkips.get(id)?.includes(name)
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
  devices: async () => ({
    ssh_host: "WIN-HOST-1",
    server_time: "2026-11-14 14:36:42",
    devices: demoDevices,
    error: "",
  }),
  configs: async () => ({
    configs: [
      { name: "cfg-****.json", label: "cfg-****" },
      { name: "cfg-****-smoke.json", label: "cfg-****-smoke" },
    ],
  }),
  config: async () => config,
  submit: async (payload) => {
    const id = `run-20261114-${String(nextRunNumber++).padStart(3, "0")}`;
    demoSkips.set(id, payload.stages.skip);
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
    demoSkips.delete(id);
    runs = runs.filter((r) => r.run_id !== id);
  },
  log: async (id, stage) => {
    const detail = await demoApi.detail(id);
    const tail = detail.stages.find((item) => item.name === stage)?.log_tail;
    return tail
      ? `[演示日志 · 脱敏数据]\n${tail}\n[2026-11-14 10:00:04] [INFO] result=****`
      : "";
  },
};
