import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "../components/StatusBadge";
import { ErrorBox } from "../components/Feedback";
import { PageHeading } from "../components/PageHeading";
import { useDevices } from "../hooks/queries";
import { api, isDemo, stages, stageLabels } from "../lib/api";
import {
  ArrowRight,
  Box,
  GitBranch,
  Layers,
  LoaderCircle,
  Plus,
  Zap,
} from "lucide-react";

function parseDeviceSerials(value: string) {
  return value
    .split(/[,，\n]/)
    .map((serial) => serial.trim())
    .filter(Boolean);
}

export function SubmitPage() {
  const navigate = useNavigate();
  const configs = useQuery({ queryKey: ["configs"], queryFn: api.configs });
  const devices = useDevices();
  const [name, setName] = useState("");
  const selected = name || configs.data?.configs[0]?.name || "";
  const cfg = useQuery({
    queryKey: ["config", selected],
    queryFn: () => api.config(selected),
    enabled: !!selected,
  });
  const [rootMR, setRootMR] = useState("");
  const [sn, setSN] = useState("");
  const serials = parseDeviceSerials(sn);
  const [profile, setProfile] = useState("");
  const [functions, setFunctions] = useState("");
  const [remark, setRemark] = useState("");
  const [skip, setSkip] = useState<string[]>([]);
  const [validation, setValidation] = useState("");
  function reset() {
    if (cfg.data) {
      setRootMR(cfg.data.editable.root_mr || "");
      setSN(cfg.data.editable.sn.join(", "));
      setProfile(cfg.data.editable.test_profile);
      setFunctions(cfg.data.editable.functions.join("\n"));
      setRemark(cfg.data.editable.remark || "");
      setSkip(stages.filter((s) => !cfg.data!.stages.includes(s)));
    }
  }
  useEffect(reset, [cfg.data]);
  const client = useQueryClient();
  const submit = useMutation({
    mutationFn: api.submit,
    onSuccess: ({ run_id }) => {
      client.invalidateQueries({ queryKey: ["runs"] });
      navigate({ to: "/tasks/$runId", params: { runId: run_id } });
    },
  });
  return (
    <>
      <PageHeading title="发布任务">
        {isDemo && <Badge status="demo-submit" />}
      </PageHeading>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (skip.length === 7) {
            setValidation("请至少选择一个执行阶段。");
            return;
          }
          setValidation("");
          submit.mutate({
            config: selected,
            overrides: {
              root_mr: rootMR,
              mr_links: [],
              sn: serials,
              test_profile: profile,
              functions: functions
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
              remark,
            },
            stages: { from_stage: "prepare", only_stage: "", skip },
          });
        }}
      >
        <div className="submit-grid">
          <div className="form-sections">
            <section className="panel form-panel">
              <div className="form-heading">
                <div>
                  <h2>基础配置</h2>
                </div>
              </div>
              <ErrorBox error={configs.error || cfg.error} />
              <label className="field">
                流水线配置 <em>*</em>
                <select
                  required
                  value={selected}
                  onChange={(e) => setName(e.target.value)}
                >
                  <option value="" disabled>
                    请选择配置
                  </option>
                  {configs.data?.configs.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label} · {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {cfg.data && (
                <div className="config-preview">
                  <span>
                    <GitBranch size={14} />
                    {String(cfg.data.readonly.branch || "—")}
                  </span>
                  <span>
                    <Box size={14} />
                    {String(cfg.data.readonly.product || "—")}
                  </span>
                  <span>Docker 构建</span>
                </div>
              )}
              <label className="field">
                Root MR
                <input
                  value={rootMR}
                  onChange={(e) => setRootMR(e.target.value)}
                  placeholder="输入 Root MR 或链接（可选）"
                />
                <small>留空将使用配置中的默认代码来源。</small>
              </label>
            </section>
            <section className="panel form-panel">
              <div className="form-heading">
                <div>
                  <h2>设备与测试</h2>
                </div>
              </div>
              <label className="field">
                样机 SN
                <input
                  value={sn}
                  onChange={(e) => setSN(e.target.value)}
                  placeholder="输入设备 SN，多个设备以逗号分隔"
                />
              </label>
              <div className="device-choices">
                <span>在线可用</span>
                {devices.data?.devices
                  .filter(
                    (d) => !d.busy && d.state !== "offline" && !d.uncertain,
                  )
                  .map((d) => (
                    <button
                      key={d.sn}
                      type="button"
                      className={serials.includes(d.sn) ? "selected" : ""}
                      onClick={() =>
                        setSN((old) => {
                          const values = parseDeviceSerials(old);
                          return (
                            values.includes(d.sn)
                              ? values.filter((s) => s !== d.sn)
                              : [...values, d.sn]
                          ).join(", ");
                        })
                      }
                    >
                      <Plus size={12} />
                      {d.sn}
                    </button>
                  ))}
              </div>
              <ErrorBox error={devices.error || devices.data?.error} />
              <label className="field">
                测试 Profile
                <select
                  value={profile}
                  onChange={(e) => {
                    setProfile(e.target.value);
                    setFunctions(
                      cfg.data?.profile_details[e.target.value]?.functions.join(
                        "\n",
                      ) || "",
                    );
                  }}
                >
                  {cfg.data?.test_profiles.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                测试用例
                <textarea
                  rows={3}
                  value={functions}
                  onChange={(e) => setFunctions(e.target.value)}
                  placeholder="每行一个用例"
                />
                <small>
                  切换 Profile 会自动带入默认用例，你也可以手动调整。
                </small>
              </label>
            </section>
            <section className="panel form-panel">
              <div className="form-heading">
                <div>
                  <h2>备注</h2>
                </div>
              </div>
              <textarea
                aria-label="备注"
                rows={3}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="任务备注（可选）"
              />
            </section>
          </div>
          <aside className="submit-side">
            <section className="panel form-panel">
              <div className="form-heading">
                <div>
                  <h2>执行阶段</h2>
                  <p>默认执行全流程，可按需跳过</p>
                </div>
                <Layers size={18} />
              </div>
              <div className="stage-checkboxes">
                {stages.map((s) => (
                  <label key={s}>
                    <input
                      type="checkbox"
                      checked={!skip.includes(s)}
                      onChange={(e) =>
                        setSkip(
                          e.target.checked
                            ? skip.filter((v) => v !== s)
                            : [...skip, s],
                        )
                      }
                    />
                    <span>
                      {stageLabels[s]}
                      <small>{s}</small>
                    </span>
                  </label>
                ))}
              </div>
              {skip.includes("flash") && (
                <div className="warning">
                  已跳过烧录，测试将基于设备现有镜像运行。
                </div>
              )}
              <div className="submit-total">
                <span>即将执行</span>
                <b>{7 - skip.length} 个阶段</b>
              </div>
              <ErrorBox error={validation || submit.error} />
              <button
                className="button primary cta full"
                disabled={!cfg.data || submit.isPending}
                type="submit"
              >
                {submit.isPending ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <Zap size={17} />
                )}{" "}
                {submit.isPending
                  ? "正在发布…"
                  : isDemo
                    ? "发布演示任务"
                    : "发布任务"}
                <ArrowRight className="cta-arrow" size={16} />
              </button>
              <button
                type="button"
                className="button ghost full"
                onClick={reset}
              >
                重置配置
              </button>
            </section>
          </aside>
        </div>
      </form>
    </>
  );
}
