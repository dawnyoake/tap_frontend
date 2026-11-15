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
  start?: string;
  end?: string;
  duration?: number;
  error?: string;
  summary?: string;
  params?: unknown;
  log_tail?: string;
  log_path?: string;
  log_size?: number;
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
  artifact_count?: number;
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
  version?: string | null;
  chip_model?: string | null;
  product_model?: string | null;
  battery_percent?: number | null;
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

export interface SubmitTaskInput {
  config: string;
  overrides: {
    root_mr: string;
    mr_links: string[];
    sn: string[];
    test_profile: string;
    functions: string[];
    remark: string;
  };
  stages: { from_stage: string; only_stage: string; skip: string[] };
}

export interface PipelineApi {
  me(): Promise<{ uid: string; label: string }>;
  runs(query: string): Promise<{ items: Run[] }>;
  detail(id: string): Promise<Detail>;
  devices(): Promise<{
    ssh_host: string;
    server_time: string;
    devices: Device[];
    error: string;
  }>;
  configs(): Promise<{ configs: Config[] }>;
  config(name: string): Promise<ConfigDetail>;
  submit(body: SubmitTaskInput): Promise<{ run_id: string }>;
  remove(id: string): Promise<unknown>;
  log(id: string, stage: string): Promise<string>;
}
