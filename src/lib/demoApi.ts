import {
  stages,
  type ConfigDetail,
  type Detail,
  type Device,
  type PipelineApi,
  type Run,
  type Stage,
  type Status,
  type SubmitTaskInput,
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
  artifact_count: (i === 3 || i === 4 ? 0 : 1) + (i === 1 ? 1 : 0),
  test_summary:
    i === 0
      ? { passed: 42, failed: 0, total: 56 }
      : i === 1
        ? { passed: 56, failed: 0, total: 56 }
        : null,
}));
let runs = [...fixtureRuns];
let nextRunNumber = fixtureRuns.length + 1;
const submittedRuns = new Map<string, { payload: SubmitTaskInput; rootCodePath?: string }>();
const demoDevices: Device[] = Array.from({ length: 6 }, (_, i) => ({
  sn: `SN-****${["0817", "0926", "1035", "1144", "1253", "1362"][i]}`,
  state: ["hdc", "hdc", "adb", "hdc", "fastboot", "offline"][i],
  raw_state: ["hdc", "hdc", "adb", "hdc", "fastboot", "offline"][i],
  busy: i === 0 || i === 2,
  busy_by: i === 0 ? runs[0].run_id : i === 2 ? runs[1].run_id : "",
  busy_stage: i === 0 ? "test" : i === 2 ? "flash" : "",
  uncertain: i === 4,
  ...(i < 4 && {
    version: i < 2 ? "TEE 2026.11.14" : "TEE 2026.11.12",
    chip_model: i < 2 ? "SoC-A1" : "SoC-B2",
    product_model: i < 2 ? "TEE-CHD-01" : "TEE-CHD-02",
    battery_percent: [82, 65, 46, 18][i],
  }),
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

function demoStages(run: Run): Stage[] {
  const submitted = submittedRuns.get(run.run_id);
  const overrides = submitted?.payload.overrides;
  const params = {
    prepare: { branch: run.branch, ...(overrides?.root_mr && { root_mr: overrides.root_mr }) },
    build: {
      product: config.readonly.product,
      docker_build: config.readonly.docker_build,
      ...(submitted?.rootCodePath && { root_code_path: submitted.rootCodePath }),
    },
    upload: {},
    publish: { branch: run.branch },
    trigger: { platform: run.platform },
    flash: { sn: run.sn },
    test: {
      sn: run.sn,
      test_profile: overrides?.test_profile || config.editable.test_profile,
      functions: overrides?.functions.length ? overrides.functions : config.editable.functions,
      timeout_s: 1800,
    },
  };

  return stages.map((name, i) => {
    const status = submitted?.payload.stages.skip.includes(name)
      ? "skipped"
      : i < run.progress.done
        ? "success"
        : name === run.current_stage
          ? run.verdict
          : "pending";
    const error = status === "timeout"
      ? "自动测试达到 30 分钟超时上限。"
      : status === "failed"
        ? "编译进程退出，退出码 2。"
        : undefined;
    const log = status === "pending" || status === "skipped"
      ? undefined
      : [
          `[INFO] run=${run.run_id}  stage=${name}`,
          ...Object.entries(params[name]).map(([key, value]) => `[INFO] ${key}=${JSON.stringify(value)}`),
          error ? `[ERROR] ${error}` : `[INFO] status=${status}`,
        ].join("\n");
    return {
      name,
      status,
      duration: status === "success" ? [5, 284, 32, 12, 8, 121, 292][i] : status === "timeout" ? 1800 : undefined,
      error,
      params: { config: submitted?.payload.config || "cfg-****.json", ...params[name] },
      log_tail: log,
      artifacts: name === "build" && status === "success"
        ? [{ name: "pkg-****.zip", size: "238 MB" }]
        : name === "test" && run.run_id === "run-20261114-007"
          ? [{ name: "测试报告（演示）.txt", download: "/demo/run-20261114-007-report.txt" }]
          : [],
    };
  });
}

export const demoApi: Omit<PipelineApi, "submit"> & {
  submit: (payload: SubmitTaskInput, rootCodePath?: string) => Promise<{ run_id: string }>;
} = {
  me: async () => ({ uid: "user-****", label: "user-****" }),
  runs: async () => ({ items: runs }),
  detail: (id: string): Promise<Detail> => {
    const run = runs.find((r) => r.run_id === id);
    if (!run) return Promise.reject(new Error("任务不存在"));
    const submitted = submittedRuns.get(id);
    return Promise.resolve({
      run_id: id,
      run_info: run,
      is_running: run.verdict === "running",
      manifest: {
        run_id: id,
        source_config: config.readonly,
        stages,
        ...(submitted && {
          overrides: submitted.payload.overrides,
          stage_selection: submitted.payload.stages,
          ...(submitted.rootCodePath && { root_code_path: submitted.rootCodePath }),
        }),
      },
      stages: demoStages(run),
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
  submit: async (payload, rootCodePath) => {
    const id = `run-20261114-${String(nextRunNumber++).padStart(3, "0")}`;
    submittedRuns.set(id, { payload, rootCodePath });
    runs = [
      {
        ...fixtureRuns[4],
        run_id: id,
        owner: "user-****",
        sn: payload.overrides.sn.join(", ") || config.editable.sn.join(", ") || "—",
        created_at: new Date().toLocaleString("sv-SE"),
        current_stage:
          stages.find((s) => !payload.stages.skip.includes(s)) || "prepare",
      },
      ...runs,
    ];
    return { run_id: id };
  },
  remove: async (id: string) => {
    submittedRuns.delete(id);
    runs = runs.filter((r) => r.run_id !== id);
  },
  log: async (id, stage) => {
    const detail = await demoApi.detail(id);
    const tail = detail.stages.find((item) => item.name === stage)?.log_tail;
    return tail ? `[演示日志 · 脱敏数据]\n${tail}` : "";
  },
};
