import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Crosshair,
  Cpu,
  FolderCode,
  GitCommitHorizontal,
  GitPullRequest,
  LoaderCircle,
  ListChecks,
  Send,
  SlidersHorizontal,
  StickyNote,
  Workflow,
} from "lucide-react";
import { Empty, ErrorBox, Loading } from "../components/Feedback";
import { useDevices } from "../hooks/queries";
import { api, isDemo, stages, stageLabels } from "../lib/api";
import type { Config, ConfigDetail, Device, SubmitTaskInput } from "../lib/contracts";
import { demoApi } from "../lib/demoApi";
import "./SubmitPage.css";

type StageName = (typeof stages)[number];
const submitRoute = getRouteApi("/submit");
const submitSources = [
  {
    source: "change-id",
    label: "Change-Id",
    description: "已有代码变更的 Change-Id，可继续配置构建和测试。",
    icon: GitCommitHorizontal,
  },
  {
    source: "root-mr",
    label: "Root MR",
    description: "已有 Root MR，可在下一步的「代码来源」中填写。",
    icon: GitPullRequest,
  },
] as const;

const deviceStatusLabels = {
  idle: "空闲",
  busy: "占用中",
  offline: "离线",
  uncertain: "状态不明",
};

function deviceStatus(device: Device) {
  if (device.state === "offline") return "offline";
  if (device.busy) return "busy";
  return device.uncertain ? "uncertain" : "idle";
}

function initialDraft(config: ConfigDetail) {
  return {
    changeId: "",
    profile: config.editable.test_profile,
    rootMR: config.editable.root_mr || "",
    rootCodePath: "",
    serial: config.editable.sn.length === 1 ? config.editable.sn[0] : "",
    functions: [...new Set(config.editable.functions.length
      ? config.editable.functions
      : config.profile_details[config.editable.test_profile]?.functions ?? [])],
    remark: config.editable.remark || "",
    skip: stages.filter((stage) => !config.stages.includes(stage)),
  };
}

interface ConfigPickerProps {
  name: string;
  options: Config[];
  onChange: (name: string) => void;
  disabled?: boolean;
}

function PipelineConfig({
  name,
  options,
  onChange,
  disabled,
}: ConfigPickerProps) {
  return (
    <section className="release-base" aria-labelledby="release-configs-title">
      <header className="release-section-heading">
        <span className="release-section-icon"><SlidersHorizontal size={16} aria-hidden="true" /></span>
        <h2 id="release-configs-title">任务配置</h2>
      </header>
      <div className="panel release-card">
        <header>
          <h3><Workflow size={16} aria-hidden="true" /><label htmlFor="release-pipeline">流水线配置</label></h3>
        </header>
        <select id="release-pipeline" value={name} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          {options.map((config) => (
            <option key={config.name} value={config.name}>
              {!config.label || config.label === config.name || config.label === config.name.replace(/\.json$/i, "")
                ? config.name.replace(/\.json$/i, "")
                : `${config.label} · ${config.name}`}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

export function SubmitPage() {
  const { source } = submitRoute.useSearch();
  const selected = submitSources.find((option) => option.source === source);

  if (selected) {
    return (
      <div className="release-source-form">
        <div className="release-source-path">
          <Link to="/submit" search={{}} className="workspace-page-return">
            <ArrowLeft size={14} aria-hidden="true" /> 重选起点
          </Link>
          <span>当前起点 · {selected.label}</span>
        </div>
        <SubmitConfiguration key={source} />
      </div>
    );
  }

  return (
    <section className="release-source-options" aria-label="选择任务起点">
      {submitSources.map(({ source, label, description, icon: Icon }) => (
        <Link key={source} to="/submit" search={{ source }} resetScroll className="panel release-source-option">
          <span className="release-source-icon"><Icon size={24} aria-hidden="true" /></span>
          <div className="release-source-copy">
            <h2>从 {label} 开始</h2>
            <p>{description}</p>
          </div>
          <ArrowRight className="release-source-arrow" size={18} aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}

function SubmitConfiguration() {
  const [name, setName] = useState("");
  const configs = useQuery({ queryKey: ["configs"], queryFn: api.configs });
  const options = configs.data?.configs ?? [];
  const selected = options.find((config) => config.name === name)?.name ?? options[0]?.name ?? "";
  const config = useQuery({
    queryKey: ["config", selected],
    queryFn: () => api.config(selected),
    enabled: Boolean(selected),
  });

  const picker = { name: selected, options, onChange: setName };
  if (config.data) {
    return <TaskForm key={selected} picker={picker} config={config.data} />;
  }
  return (
    <div className="submit-workspace">
      {selected && (
        <div className="release-layout release-layout-loading"><PipelineConfig {...picker} /></div>
      )}
      <ErrorBox error={configs.error || config.error} />
      {(configs.isPending || (selected && config.isPending)) && <Loading />}
      {configs.isSuccess && !selected && <Empty text="暂无可用的流水线配置" />}
    </div>
  );
}

function TaskForm({ picker, config }: { picker: ConfigPickerProps; config: ConfigDetail }) {
  const [draft, setDraft] = useState(() => initialDraft(config));
  const { source } = submitRoute.useSearch();
  const changeMode = source === "change-id";
  const changeId = draft.changeId.match(/I[0-9a-fA-F]{40}(?![0-9a-fA-F])/)?.[0] ?? "";
  const visibleStages = changeMode ? stages.slice(4) : stages;
  const roots = useQuery({ queryKey: ["test-roots", picker.name, draft.profile], queryFn: () => api.testRoots(picker.name, draft.profile) });
  const [editingStages, setEditingStages] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  const devices = useDevices();
  const submit = useMutation({
    mutationFn: ({ payload, rootCodePath }: { payload: SubmitTaskInput; rootCodePath?: string }) =>
      isDemo ? demoApi.submit(payload, rootCodePath) : api.submit(payload),
    onSuccess: ({ run_id }) => {
      client.invalidateQueries({ queryKey: ["runs"] });
      navigate({ to: "/tasks/$runId", params: { runId: run_id } });
    },
  });

  const active = visibleStages.filter((stage) => (changeMode && stage === "trigger") || !draft.skip.includes(stage));
  const skipped = visibleStages.filter((stage) => draft.skip.includes(stage));
  const stageRows = editingStages ? visibleStages : active;
  const StageRow = editingStages ? "label" : "div";
  const prepare = active.includes("prepare");
  const flash = active.includes("flash");
  const test = active.includes("test");
  const usesDevice = flash || test;
  const needsRootPath = isDemo && !prepare && active.length > 0;
  const rootCodePath = draft.rootCodePath.trim();
  const missingPath = needsRootPath && !rootCodePath;
  const selectedSerial = draft.serial;
  const reportedDevices = devices.data?.devices ?? [];
  const scanningDevices = devices.isFetching && !devices.data;
  const hasSelectableDevice = reportedDevices.some((device) => deviceStatus(device) === "idle");
  const selectedDevice = reportedDevices.find((device) => device.sn === selectedSerial);
  const selectedStatus = selectedDevice ? deviceStatus(selectedDevice) : undefined;
  const selectedUnavailable = selectedStatus !== undefined && selectedStatus !== "idle";
  const needsDeviceChoice = /[,，\s]/.test(selectedSerial)
    || (!selectedSerial && (hasSelectableDevice || config.editable.sn.length > 1));
  const deviceIssue = hasSelectableDevice
    ? selectedUnavailable
      ? `当前样机${deviceStatusLabels[selectedStatus]}，请选择其他样机`
      : needsDeviceChoice ? "请选择一台样机" : undefined
      : undefined;
  const deviceBlocked = usesDevice && (
    scanningDevices || needsDeviceChoice || selectedUnavailable
  );
  const deviceSummary = [selectedDevice?.product_model?.trim(), selectedSerial].filter(Boolean).join(" · ");
  const testCases = roots.data?.roots ?? [];
  const missingCases = test && draft.functions.length === 0;
  const issue = changeMode && !changeId
    ? { target: "release-change-id", label: "填写合法的 Change-Id 或 Hibuild 链接" }
    : test && (roots.isPending || roots.isError) ? { target: "release-test-range", label: "测试范围尚未加载成功" }
    : !active.length
    ? { target: editingStages ? "release-first-stage" : "release-adjust-stages", label: "启用至少一个执行阶段" }
    : missingPath
      ? { target: "release-root-path", label: "填写 Root 代码路径" }
      : usesDevice && deviceIssue
        ? { target: "release-device-picker", label: deviceIssue }
        : missingCases
          ? { target: "release-test-range", label: testCases.length ? "至少选择一项测试用例" : "当前配置没有可选测试用例" }
          : undefined;
  const branch = typeof config.readonly.branch === "string" ? config.readonly.branch : "";
  const product = typeof config.readonly.product === "string" ? config.readonly.product : "";
  const summaries: Partial<Record<StageName, string>> = {
    prepare: prepare
      ? draft.rootMR.trim() || branch || "配置默认代码来源"
      : needsRootPath
        ? rootCodePath || "需填写 Root 代码路径"
        : undefined,
    build: active.includes("build")
      ? [product, config.readonly.docker_build === true && "Docker"].filter(Boolean).join(" · ")
      : undefined,
    flash: flash ? deviceSummary || "未指定设备" : undefined,
    test: test
      ? [
          `${draft.functions.length} 项用例`,
          !flash && (deviceSummary || "未指定设备"),
        ].filter(Boolean).join(" · ")
      : undefined,
  };

  function updateDraft(update: Partial<typeof draft>) {
    submit.reset();
    setDraft((previous) => ({ ...previous, ...update }));
  }

  function toggleStage(stage: StageName, enabled: boolean) {
    updateDraft({
      skip: enabled ? draft.skip.filter((item) => item !== stage) : [...draft.skip, stage],
    });
  }

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (issue || deviceBlocked || submit.isPending) return;
    submit.mutate({
      payload: {
        config: picker.name,
        overrides: {
          change_id: changeId,
          test: { skip_flash: !flash && test },
          root_mr: prepare ? draft.rootMR.trim() : "",
          mr_links: [],
          sn: usesDevice && selectedSerial ? [selectedSerial] : [],
          test_profile: draft.profile,
          functions: test ? draft.functions : [],
          remark: draft.remark,
        },
        stages: { from_stage: changeMode ? "trigger" : "prepare", only_stage: "", skip: skipped.filter((stage) => !(changeMode && stage === "trigger")) },
      },
      rootCodePath: needsRootPath ? rootCodePath : undefined,
    });
  }

  return (
    <form className="submit-workspace" onSubmit={publish}>
      <div className="release-layout">
        <PipelineConfig {...picker} disabled={submit.isPending} />
        <div className="release-configs">
          {needsRootPath && (
            <section className={`panel release-card release-path${missingPath ? " needs-value" : ""}`} aria-labelledby="release-path-title">
              <header>
                <h3 id="release-path-title"><FolderCode size={16} aria-hidden="true" />Root 代码路径</h3>
              </header>
              <p id="release-path-help">已跳过环境准备。填写已有代码的根目录，例如 <code>D:\work\tee-root</code>。</p>
              <input
                id="release-root-path"
                aria-labelledby="release-path-title"
                aria-describedby={missingPath ? "release-path-help release-path-error" : "release-path-help"}
                aria-invalid={missingPath}
                required
                spellCheck={false}
                value={draft.rootCodePath}
                disabled={submit.isPending}
                onChange={(event) => updateDraft({ rootCodePath: event.target.value })}
              />
              {missingPath && <p id="release-path-error" className="release-problem">请填写 Root 代码路径。</p>}
            </section>
          )}
          {changeMode && <section className="panel release-card"><h3>代码来源 · Change-Id</h3><input id="release-change-id" value={draft.changeId} onChange={(e) => updateDraft({ changeId: e.target.value })} placeholder="Hibuild 链接或 Change-Id" /></section>}
          {prepare && (
            <section className="panel release-card" aria-labelledby="release-source-title">
              <header>
                <h3 id="release-source-title"><GitPullRequest size={16} aria-hidden="true" />代码来源</h3>
              </header>
              <label className="field">
                Root MR <span className="release-muted">（可选）</span>
                <input
                  value={draft.rootMR}
                  disabled={submit.isPending}
                  onChange={(event) => updateDraft({ rootMR: event.target.value })}
                  placeholder="输入 MR 编号或链接"
                />
                <small>留空时使用流水线配置的默认代码来源。</small>
              </label>
            </section>
          )}
          {usesDevice && (
            <section className="panel release-card" aria-labelledby="release-device-title">
              <header>
                <h3 id="release-device-title"><Cpu size={16} aria-hidden="true" />{test ? "设备与测试" : "目标设备"}</h3>
              </header>
              <div className="release-device-test">
                <fieldset id="release-device-picker" className="release-device-picker" tabIndex={-1}>
                  <legend>{hasSelectableDevice ? "选择样机" : "样机资源"}</legend>
                  {reportedDevices.length > 0 ? (
                    <div className="release-device-options">
                      {reportedDevices.map((device) => {
                        const { sn, product_model } = device;
                        const status = deviceStatus(device);
                        return (
                          <label className="release-device-option" key={sn}>
                            <span className="release-device-model">{product_model?.trim() || "型号未上报"}</span>
                            <span className={`release-device-state ${status}`}>{deviceStatusLabels[status]}</span>
                            <span className="release-device-serial">{sn}</span>
                            <input
                              type="radio"
                              name="release-device"
                              value={sn}
                              checked={selectedSerial === sn}
                              disabled={status !== "idle" || submit.isPending}
                              onChange={() => updateDraft({ serial: sn })}
                            />
                          </label>
                        );
                      })}
                    </div>
                  ) : scanningDevices ? (
                    <p className="release-device-scan" role="status">
                      <LoaderCircle className="spin" size={16} aria-hidden="true" />
                      正在扫描样机资源…
                    </p>
                  ) : !devices.error && !devices.data?.error && (
                    <p className="release-muted">暂无上报的样机</p>
                  )}
                  {reportedDevices.length > 0 && !hasSelectableDevice && (
                    <p className="release-muted" role="status">暂无空闲样机</p>
                  )}
                  {!scanningDevices && selectedSerial && !selectedDevice && (
                    <p className="release-muted">配置默认样机 {selectedSerial} · 状态未上报</p>
                  )}
                  {deviceIssue && <p className="release-problem" role="status">{deviceIssue}</p>}
                  <ErrorBox error={devices.error || devices.data?.error} />
                </fieldset>
                {test && (
                  <fieldset id="release-test-range" className="release-test-config" tabIndex={-1}>
                    <legend>测试范围</legend>
                    {testCases.length > 0 ? (
                      <div className="release-test-cases">
                        {testCases.map((testCase) => (
                          <label key={testCase} className="checkbox">
                            <input
                              type="checkbox"
                              checked={draft.functions.includes(testCase)}
                              disabled={submit.isPending}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                updateDraft({
                                  functions: testCases.filter((item) =>
                                    item === testCase ? checked : draft.functions.includes(item),
                                  ),
                                });
                              }}
                            />
                            <span>{testCase}</span>
                          </label>
                        ))}
                      </div>
                    ) : <p className="release-muted">当前配置没有可选测试用例。</p>}
                  </fieldset>
                )}
              </div>
            </section>
          )}
          <details className="panel release-advanced">
            <summary>
              <StickyNote size={16} aria-hidden="true" />
              <span>进阶</span>
              <ChevronDown className="release-advanced-chevron" size={15} aria-hidden="true" />
            </summary>
            <div className="release-advanced-content">
              <label className="field">测试模板<select value={draft.profile} onChange={(e) => updateDraft({ profile: e.target.value, functions: [] })}><option value="">配置默认模板</option>{config.test_profiles.map(p => <option key={p}>{p}</option>)}</select></label>
              <label className="field">
                任务备注
                <textarea
                  rows={3}
                  value={draft.remark}
                  disabled={submit.isPending}
                  onChange={(event) => updateDraft({ remark: event.target.value })}
                />
              </label>
            </div>
          </details>
        </div>

        <section className="release-stage-list" aria-labelledby="release-stages-title">
          <header className="release-section-heading">
            <span className="release-section-icon"><ListChecks size={16} aria-hidden="true" /></span>
            <h2 id="release-stages-title">本次将执行</h2>
            <button
              id="release-adjust-stages"
              type="button"
              className="release-adjust"
              aria-expanded={editingStages}
              aria-controls="release-stage-plan"
              onClick={() => setEditingStages((editing) => !editing)}
            >
              {editingStages ? "收起调整" : "调整阶段"} <ChevronDown size={14} aria-hidden="true" />
            </button>
          </header>
          <div className="panel release-stage-plan" id="release-stage-plan">
            {stageRows.length ? (
              <ol className="release-stages" role="list">
                {stageRows.map((stage, index) => {
                  const enabled = active.includes(stage);
                  const summary = summaries[stage];
                  const summaryId = `release-summary-${stage}`;
                  return (
                    <li key={stage}>
                      <StageRow className={`release-stage-row${editingStages ? " is-editing" : ""}`}>
                        <span className="release-stage-name">
                          {!editingStages && <span className="release-stage-order" aria-hidden="true">{index + 1}</span>}
                          {stageLabels[stage]}
                        </span>
                        {summary && (
                          <small id={summaryId} className={stage === "prepare" && missingPath ? "release-problem" : undefined}>
                            {summary}
                          </small>
                        )}
                        {editingStages && (
                          <span className="release-stage-toggle">
                            <span aria-hidden="true">{enabled ? "执行" : "跳过"}</span>
                            <input
                              id={index === 0 ? "release-first-stage" : undefined}
                              type="checkbox"
                              role="switch"
                              aria-label={stageLabels[stage]}
                              aria-describedby={summary ? summaryId : undefined}
                              checked={enabled}
                              disabled={submit.isPending || (changeMode && stage === "trigger")}
                              onChange={(event) => toggleStage(stage, event.target.checked)}
                            />
                          </span>
                        )}
                      </StageRow>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="release-stage-empty">尚未启用任何阶段</p>}
            <div className="release-stage-notes">
              {!editingStages && skipped.length > 0 && (
                <p><strong>已跳过</strong> {skipped.map((stage) => stageLabels[stage]).join("、")}</p>
              )}
              {!editingStages && needsRootPath && (
                <p className={missingPath ? "release-problem" : undefined}>
                  {missingPath ? "需填写 Root 代码路径" : <>使用已有代码 <code>{rootCodePath}</code></>}
                </p>
              )}
              {!isDemo && !prepare && active.length > 0 && <p>代码来源按流水线配置处理。</p>}
              {!flash && test && <p className="release-problem">自动测试将使用设备现有镜像。</p>}
            </div>
          </div>
        </section>

        <div className="panel release-publish">
          {issue && (
            <button
              type="button"
              className="release-fix"
              onClick={(event) => {
                const field = event.currentTarget.form?.querySelector<HTMLElement>(`#${issue.target}`);
                if (issue.target === "release-adjust-stages") setEditingStages(true);
                field?.focus();
                field?.scrollIntoView({ block: "nearest" });
              }}
            >
              {issue.label} <Crosshair size={14} aria-hidden="true" />
            </button>
          )}
          <button className="button primary cta" type="submit" disabled={Boolean(issue) || deviceBlocked || submit.isPending}>
            {submit.isPending ? "正在发布…" : isDemo ? "发布演示任务" : "发布任务"}
            {submit.isPending
              ? <LoaderCircle size={16} className="spin" aria-hidden="true" />
              : <Send size={16} className="cta-arrow" aria-hidden="true" />}
          </button>
          <ErrorBox error={submit.error} />
        </div>
      </div>
    </form>
  );
}
