import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Cpu,
  FlaskConical,
  FolderCode,
  GitPullRequest,
  LoaderCircle,
  Plus,
  StickyNote,
  Zap,
} from "lucide-react";
import { Empty, ErrorBox, Loading } from "../components/Feedback";
import { useDevices } from "../hooks/queries";
import { api, isDemo, stages, stageLabels } from "../lib/api";
import type { Config, ConfigDetail, SubmitTaskInput } from "../lib/contracts";
import { demoApi } from "../lib/demoApi";
import "./SubmitPage.css";

type StageName = (typeof stages)[number];

function splitValues(value: string, delimiter: RegExp) {
  return value.split(delimiter).map((item) => item.trim()).filter(Boolean);
}

function initialDraft(config: ConfigDetail) {
  return {
    rootMR: config.editable.root_mr || "",
    rootCodePath: "",
    serials: config.editable.sn.join(", "),
    profile: config.editable.test_profile,
    caseDrafts: { [config.editable.test_profile]: config.editable.functions.join("\n") },
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
  onReset,
}: ConfigPickerProps & { onReset?: () => void }) {
  return (
    <section className="release-base" aria-labelledby="release-configs-title">
      <header className="release-section-heading">
        <h2 id="release-configs-title">任务配置</h2>
      </header>
      <div className="panel release-card">
        <header>
          <h3><label htmlFor="release-pipeline">流水线配置</label></h3>
          {onReset && (
            <button type="button" className="release-reset" disabled={disabled} onClick={onReset}>
              重置配置
            </button>
          )}
        </header>
        <select id="release-pipeline" value={name} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          {options.map((config) => (
            <option key={config.name} value={config.name}>
              {!config.label || config.label === config.name || config.label === config.name.replace(/\.json$/i, "")
                ? config.name
                : `${config.label} · ${config.name}`}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

export function SubmitPage() {
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

  const active = stages.filter((stage) => !draft.skip.includes(stage));
  const prepare = active.includes("prepare");
  const flash = active.includes("flash");
  const test = active.includes("test");
  const usesDevice = flash || test;
  const needsRootPath = isDemo && !prepare && active.length > 0;
  const rootCodePath = draft.rootCodePath.trim();
  const missingPath = needsRootPath && !rootCodePath;
  const serials = [...new Set(splitValues(draft.serials, /[,，\n]/))];
  const availableDevices = devices.data?.devices.filter((device) =>
    !device.busy && device.state !== "offline" && !device.uncertain,
  ) ?? [];
  const deviceSummary = (serials.length ? serials : config.editable.sn).join("、");
  const caseText = Object.hasOwn(draft.caseDrafts, draft.profile)
    ? draft.caseDrafts[draft.profile]
    : config.profile_details[draft.profile]?.functions.join("\n") ?? "";
  const functions = splitValues(caseText, /\n/);
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
          draft.profile,
          functions.length ? `${functions.length} 项用例` : "使用配置默认用例",
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
    if (!active.length || missingPath || submit.isPending) return;
    submit.mutate({
      payload: {
        config: picker.name,
        overrides: {
          root_mr: prepare ? draft.rootMR.trim() : "",
          mr_links: [],
          sn: usesDevice ? serials : [],
          test_profile: test ? draft.profile : "",
          functions: test ? functions : [],
          remark: draft.remark,
        },
        stages: { from_stage: "prepare", only_stage: "", skip: draft.skip },
      },
      rootCodePath: needsRootPath ? rootCodePath : undefined,
    });
  }

  return (
    <form className="submit-workspace" onSubmit={publish}>
      <div className="release-layout">
        <PipelineConfig
          {...picker}
          disabled={submit.isPending}
          onReset={() => {
            submit.reset();
            setDraft(initialDraft(config));
          }}
        />
        <section className="release-stage-list" aria-labelledby="release-stages-title">
          <header className="release-section-heading">
            <h2 id="release-stages-title">执行阶段</h2>
            <span className="release-stage-count" aria-live="polite">执行 {active.length} / {stages.length}</span>
          </header>
          <ol className="panel release-stages">
            {stages.map((stage) => {
              const enabled = active.includes(stage);
              const summary = summaries[stage];
              const summaryId = `release-summary-${stage}`;
              return (
                <li key={stage}>
                  <label>
                    <span className="release-stage-name">{stageLabels[stage]}</span>
                    {summary && (
                      <small id={summaryId} className={stage === "prepare" && missingPath ? "release-problem" : undefined}>
                        {summary}
                      </small>
                    )}
                    <span className="release-stage-toggle">
                      <span aria-hidden="true">{enabled ? "执行" : "跳过"}</span>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label={stageLabels[stage]}
                        aria-describedby={summary ? summaryId : undefined}
                        checked={enabled}
                        disabled={submit.isPending}
                        onChange={(event) => toggleStage(stage, event.target.checked)}
                      />
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
          {!flash && test && <p className="release-warning">自动测试将使用设备现有镜像。</p>}
        </section>

        <div className="release-configs">
          {needsRootPath && (
            <section className={`panel release-card release-path${missingPath ? " needs-value" : ""}`} aria-labelledby="release-path-title">
              <header>
                <h3 id="release-path-title"><FolderCode size={17} aria-hidden="true" />Root 代码路径</h3>
                <span>必填</span>
              </header>
              <p id="release-path-help">已跳过环境准备。填写已有代码的根目录，例如 <code>D:\work\tee-root</code>。</p>
              <input
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
          {prepare && (
            <section className="panel release-card" aria-labelledby="release-source-title">
              <header>
                <h3 id="release-source-title"><GitPullRequest size={17} aria-hidden="true" />代码来源</h3>
                <span>环境准备</span>
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
          {!isDemo && !prepare && active.length > 0 && (
            <p className="release-warning">已跳过环境准备。真实接口按流水线配置处理代码来源。</p>
          )}
          {usesDevice && (
            <section className="panel release-card" aria-labelledby="release-device-title">
              <header>
                <h3 id="release-device-title"><Cpu size={17} aria-hidden="true" />目标设备</h3>
                <span>{[flash && "设备烧录", test && "自动测试"].filter(Boolean).join(" / ")}</span>
              </header>
              <label className="field">
                样机 SN
                <input
                  value={draft.serials}
                  disabled={submit.isPending}
                  onChange={(event) => updateDraft({ serials: event.target.value })}
                  placeholder="多个设备以逗号分隔"
                />
                {config.editable.sn.length > 0 && <small>留空时使用配置默认设备。</small>}
              </label>
              {availableDevices.length > 0 && (
                <div className="device-choices">
                  <span>在线可用</span>
                  {availableDevices.map(({ sn }) => (
                    <button
                      key={sn}
                      type="button"
                      aria-pressed={serials.includes(sn)}
                      className={serials.includes(sn) ? "selected" : ""}
                      disabled={submit.isPending}
                      onClick={() => updateDraft({
                        serials: (serials.includes(sn) ? serials.filter((value) => value !== sn) : [...serials, sn]).join(", "),
                      })}
                    >
                      <Plus size={12} aria-hidden="true" />{sn}
                    </button>
                  ))}
                </div>
              )}
              <ErrorBox error={devices.error || devices.data?.error} />
            </section>
          )}
          {test && (
            <section className="panel release-card" aria-labelledby="release-test-title">
              <header>
                <h3 id="release-test-title"><FlaskConical size={17} aria-hidden="true" />测试配置</h3>
              </header>
              <div className="release-test-fields">
                <label className="field">
                  测试 Profile
                  <select
                    value={draft.profile}
                    disabled={submit.isPending}
                    onChange={(event) => updateDraft({ profile: event.target.value })}
                  >
                    {!config.test_profiles.includes(config.editable.test_profile) && (
                      <option value={config.editable.test_profile}>
                        {config.editable.test_profile || "使用配置默认值"}
                      </option>
                    )}
                    {config.test_profiles.map((profile) => <option key={profile}>{profile}</option>)}
                  </select>
                </label>
                <label className="field">
                  测试用例
                  <textarea
                    rows={3}
                    value={caseText}
                    disabled={submit.isPending}
                    onChange={(event) => updateDraft({
                      caseDrafts: { ...draft.caseDrafts, [draft.profile]: event.target.value },
                    })}
                    placeholder="每行一个用例"
                  />
                </label>
              </div>
              <p>各 Profile 分别保留编辑内容。清空用例时沿用配置默认值。</p>
            </section>
          )}
          <section className="panel release-card" aria-labelledby="release-remark-title">
            <header>
              <h3 id="release-remark-title"><StickyNote size={17} aria-hidden="true" />备注</h3>
              <span>可选</span>
            </header>
            <textarea
              aria-labelledby="release-remark-title"
              rows={3}
              value={draft.remark}
              disabled={submit.isPending}
              onChange={(event) => updateDraft({ remark: event.target.value })}
            />
          </section>
        </div>

        <div className="release-publish">
          {!active.length && <p className="release-warning" role="alert">请至少将一个阶段设为「执行」。</p>}
          <ErrorBox error={submit.error} />
          <button className="button primary cta full" type="submit" disabled={!active.length || missingPath || submit.isPending}>
            {submit.isPending ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <Zap size={17} aria-hidden="true" />}
            {submit.isPending ? "正在发布…" : isDemo ? "发布演示任务" : "发布任务"}
            <ArrowRight className="cta-arrow" size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  );
}
