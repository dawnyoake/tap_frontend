import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  Crosshair,
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
    description: "从 Root MR 或单仓 MR 开始。",
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
        <h2 id="release-configs-title">适用配置</h2>
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

function matchesDevice(config: Config, device: Device) {
  const model = device.product_model?.trim().toLowerCase();
  if (!model) return true;
  return (config.device_match?.length ? config.device_match : [config.device_model ?? ""])
    .some(value => { const match = value.trim().toLowerCase(); return !!match && (model.includes(match) || match.includes(model)); });
}

export function SubmitPage() {
  const { source } = submitRoute.useSearch();
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [remark, setRemark] = useState("");
  const [continued, setContinued] = useState(false);
  const [serial, setSerial] = useState("");
  const [name, setName] = useState("");
  const devices = useDevices();
  const configs = useQuery({ queryKey: ["configs"], queryFn: api.configs });
  const device = devices.data?.devices.find(d => d.sn === serial);
  const options = device ? (configs.data?.configs ?? []).filter(c => matchesDevice(c, device)) : [];
  const selected = options.find(c => c.name === name)?.name ?? options[0]?.name ?? "";
  const valid = source === "root-mr" || (source === "change-id" && /I[0-9a-fA-F]{40}(?![0-9a-fA-F])/.test(link));
  const config = useQuery({ queryKey: ["config", selected], queryFn: () => api.config(selected), enabled: continued && !!device && !!selected });
  return <div className="release-flow">
    <div className="release-flow-intro"><span className="release-muted">发布任务 / NEW RUN</span><h2>从代码变更，到验证结果</h2><p>填写来源，选择样机，再配置本次流水线。</p></div>
    <section className="panel release-card">
      <h3><span className="release-step">01</span>任务来源</h3>
      <div className="release-source-tabs">{submitSources.map(({source: value, label, icon: Icon}) =>
        <button type="button" className={source === value ? "is-selected" : ""} key={value} aria-pressed={source === value} onClick={() => { setContinued(false); navigate({to: "/submit", search: {source: value}}); }}><Icon size={17}/>{label}</button>)}</div>
      <label className="field">{source === "root-mr" ? "Root MR / 单仓 MR（可选）" : "Change-Id / Hibuild 链接"}
        <input value={link} onChange={e => {setLink(e.target.value); setContinued(false);}} placeholder={source === "root-mr" ? "留空使用配置默认来源" : "粘贴包含 I… 的变更链接"}/>
      </label>
      <button type="button" className="button release-next" disabled={!valid} onClick={() => setContinued(true)}>{continued ? "来源已确认" : "下一步 · 选择样机"}</button>
    </section>
    {continued && <section className="panel release-card release-flow-reveal">
      <h3><span className="release-step">02</span>选择资源池样机</h3>
      <p>选择一台空闲样机，自动筛选适用的流水线。</p>
      <div className="release-device-options">{devices.data?.devices.map(d => <label key={d.sn} className="release-device-option">
        <span className="release-device-model">{d.product_model || "型号未上报"}</span><span className={`release-device-state ${deviceStatus(d)}`}>{deviceStatusLabels[deviceStatus(d)]}</span>
        <span className="release-device-serial">{d.sn}</span><input type="radio" name="device" checked={serial === d.sn} disabled={deviceStatus(d) !== "idle"} onChange={() => setSerial(d.sn)}/>
        <small>{d.raw_state || d.state}{d.busy_by ? ` · ${d.busy_by}` : ""}</small>
      </label>)}</div>
      {devices.isPending && <Loading/>}<ErrorBox error={devices.error || devices.data?.error}/>
      {devices.data && !devices.data.devices.length && <Empty text="暂无上报的样机"/>}
    </section>}
    {continued && device && <div className="release-flow-reveal">
      <ErrorBox error={configs.error || config.error}/>
      {configs.isPending && <Loading/>}
      {configs.isSuccess && !selected && <Empty text="没有与当前样机匹配的流水线配置，请检查配置的 device_match / device_model 元数据。"/>}
      {name && name !== selected && selected && <p role="status" className="release-muted">已切换到当前样机兼容的配置。</p>}
      {selected && config.isPending && <Loading/>}
      {selected && config.data && <TaskForm key={selected} picker={{name: selected, options, onChange: setName}} config={config.data} serial={serial} link={link} remark={remark} setRemark={setRemark}/>}
    </div>}
  </div>;
}

function TaskForm({ picker, config, serial, link, remark, setRemark }: { picker: ConfigPickerProps; config: ConfigDetail; serial: string; link: string; remark: string; setRemark: (value: string) => void }) {
  const [draft, setDraft] = useState(() => initialDraft(config));
  const { source } = submitRoute.useSearch();
  const changeMode = source === "change-id";
  const changeId = link.match(/I[0-9a-fA-F]{40}(?![0-9a-fA-F])/)?.[0] ?? "";
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
  const needsRootPath = isDemo && !changeMode && !prepare && active.length > 0;
  const rootCodePath = draft.rootCodePath.trim();
  const missingPath = needsRootPath && !rootCodePath;
  const selectedSerial = serial;
  const reportedDevices = devices.data?.devices ?? [];
  const scanningDevices = devices.isFetching && !devices.data;
  const hasSelectableDevice = reportedDevices.some((device) => deviceStatus(device) === "idle");
  const selectedDevice = reportedDevices.find((device) => device.sn === selectedSerial);
  const selectedStatus = selectedDevice ? deviceStatus(selectedDevice) : undefined;
  const selectedUnavailable = selectedStatus !== "idle";
  const needsDeviceChoice = /[,，\s]/.test(selectedSerial)
    || (!selectedSerial && (hasSelectableDevice || config.editable.sn.length > 1));
  const deviceIssue = hasSelectableDevice
    ? selectedUnavailable
      ? `当前样机${selectedStatus ? deviceStatusLabels[selectedStatus] : "未上报"}，请选择其他样机`
      : needsDeviceChoice ? "请选择一台样机" : undefined
      : undefined;
  const deviceBlocked = usesDevice && (
    scanningDevices || needsDeviceChoice || selectedUnavailable
  );
  const deviceSummary = [selectedDevice?.product_model?.trim(), selectedSerial].filter(Boolean).join(" · ");
  const testCases = roots.data?.roots ?? [];
  const missingCases = test && !draft.functions.some(item => testCases.includes(item));
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
      ? link.trim() || branch || "配置默认代码来源"
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
          root_mr: prepare ? link.trim() : "",
          mr_links: [],
          sn: usesDevice && selectedSerial ? [selectedSerial] : [],
          test_profile: draft.profile,
          functions: test ? draft.functions.filter(item => testCases.includes(item)) : [],
          remark,
        },
        stages: { from_stage: changeMode ? "trigger" : "prepare", only_stage: "", skip: skipped.filter((stage) => !(changeMode && stage === "trigger")) },
      },
      rootCodePath: needsRootPath ? rootCodePath : undefined,
    });
  }

  return (
    <form className="submit-workspace" onSubmit={publish}>
      <div className="release-layout">
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
          <section className="panel release-card">
            <h3><span className="release-step">03</span>流水线配置与测试</h3>
            <PipelineConfig {...picker} disabled={submit.isPending} />
            <p>{["branch", "task", "product", "platform"].map(key => config.readonly[key]).filter(v => typeof v === "string").join(" · ") || "使用配置默认参数"}</p>
            <div className="release-device-test">
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
                  value={remark}
                  disabled={submit.isPending}
                  onChange={(event) => setRemark(event.target.value)}
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
