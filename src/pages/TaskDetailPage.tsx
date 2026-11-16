import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { Badge } from "../components/StatusBadge";
import { Empty, ErrorBox, Loading } from "../components/Feedback";
import { Pipeline } from "../components/RunProgress";
import { JsonPanel } from "../components/RunLogs";
import { StageDetails } from "../components/StageDetails";
import { ArtifactAction } from "../components/ArtifactAction";
import { usePolling } from "../hooks/queries";
import { api, stages, stageLabels, duration } from "../lib/api";
import { findFaultStage, isStageFault, type StageName } from "../lib/runStages";
import {
  Activity,
  ArrowDownRight,
  Box,
  CircleAlert,
  Clock3,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import "./TaskDetailPage.css";

const detailRoute = getRouteApi("/tasks/$runId");

function focusStage(target: HTMLElement) {
  const details = target.querySelector("details");
  if (details) details.open = true;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "start" });
}

export function TaskDetailPage() {
  const { runId } = detailRoute.useParams();
  const { tab, stage } = detailRoute.useSearch();
  const focusedStage = tab === "stages" ? stage : undefined;
  const stageTarget = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const visible = usePolling();
  const detail = useQuery({
    queryKey: ["detail", runId],
    queryFn: () => api.detail(runId),
    refetchInterval: (q) =>
      visible && q.state.data?.is_running ? 2000 : false,
  });
  const hasDetail = Boolean(detail.data);
  useEffect(() => {
    const target = stageTarget.current;
    if (!hasDetail || !focusedStage || !target) return;
    const frame = requestAnimationFrame(() => focusStage(target));
    return () => cancelAnimationFrame(frame);
  }, [hasDetail, focusedStage, runId]);
  const [confirm, setConfirm] = useState(false);
  const client = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.remove(runId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["runs"] });
      navigate({ to: "/tasks" });
    },
  });
  if (detail.isLoading) return <Loading />;
  if (!detail.data) return <ErrorBox error={detail.error} />;
  const d = detail.data,
    r = d.run_info;
  const fault = findFaultStage(r, d.stages);
  const faultStage = d.stages.find((item) => item.name === fault);
  const faultStatus = isStageFault(faultStage?.status) ? faultStage.status : r.verdict;
  const selectedStage = tab === "stages" ? focusedStage || fault : undefined;

  function jumpToStage(name: StageName) {
    if (name === focusedStage && stageTarget.current) {
      focusStage(stageTarget.current);
      return;
    }
    void navigate({
      to: "/tasks/$runId",
      params: { runId },
      search: { tab: "stages", stage: name },
      resetScroll: false,
    });
  }

  return (
    <>
      <ErrorBox error={detail.error} />
      <section className="panel detail-banner diagnostic-banner">
        <header className="detail-task-header">
          <div className="detail-task-identity">
            {r.task && r.task !== runId && <h2>{r.task}</h2>}
            <span className="mono">{runId}</span>
            <Badge status={r.verdict} />
          </div>
          <div className="content-actions">
            <button className="button" onClick={() => detail.refetch()}>
              <RefreshCw size={15} className={detail.isFetching ? "spin" : ""} />
              刷新
            </button>
            <button
              className="icon-button"
              aria-label="删除任务"
              disabled={d.is_running}
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </header>
        <dl className="diagnostic-metrics">
          <div><dt>进度</dt><dd>{r.progress.done} / {r.progress.total}</dd></div>
          <div><dt>运行耗时</dt><dd className="mono">{duration(r.duration)}</dd></div>
          {r.owner && <div><dt>提交者</dt><dd>{r.owner}</dd></div>}
        </dl>
        {fault && (
          <div className={`diagnostic-fault ${faultStatus}`}>
            {faultStatus === "timeout" ? <Clock3 size={19} aria-hidden="true" /> : <CircleAlert size={19} aria-hidden="true" />}
            <div>
              <strong>{stageLabels[fault]}{faultStatus === "timeout" ? "超时" : "失败"}</strong>
              {(faultStage?.error || faultStage?.summary) && <p>{faultStage.error || faultStage.summary}</p>}
            </div>
            <button type="button" className="button" onClick={() => jumpToStage(fault)}>
              查看故障阶段 <ArrowDownRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}
        <Pipeline
          detail={d}
          fault={fault ? { name: fault, status: faultStatus } : undefined}
          selected={selectedStage}
          onStageSelect={jumpToStage}
        />
      </section>
      <div className="detail-tabs">
        {[
          ["overview", "概览"],
          ["stages", "阶段详情"],
          ["artifacts", "产物"],
          ["manifest", "DEBUG"],
        ].map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() =>
              navigate({
                to: "/tasks/$runId",
                params: { runId },
                search: { tab: id },
              })
            }
          >
            {label}
            {id === "artifacts" && (
              <span>{d.stages.flatMap((s) => s.artifacts || []).length}</span>
            )}
          </button>
        ))}
      </div>
      <div className="detail-tab-content" key={tab}>
        {tab === "overview" ? (
          <div className="detail-grid">
            <section className="panel">
              <div className="panel-title">
                <h2>任务信息</h2>
                <Settings2 size={16} />
              </div>
              <dl className="info-grid">
                {[
                  ["分支", r.branch],
                  ["目标平台", r.platform],
                  ["Change-Id", r.change_id],
                  ["设备 SN", r.sn],
                  ["创建时间", r.created_at],
                  ["关键产物", r.key_artifact],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="panel">
              <div className="panel-title">
                <h2>测试概况</h2>
                <Activity size={16} />
              </div>
              {r.test_summary ? (
                <div className="test-summary">
                  <div
                    className="test-ring"
                    style={
                      {
                        "--progress": `${((r.test_summary.passed || 0) / (r.test_summary.total || 1)) * 100}%`,
                      } as CSSProperties
                    }
                  >
                    <span>
                      <strong>
                        {Math.round(
                          ((r.test_summary.passed || 0) /
                            (r.test_summary.total || 1)) *
                            100,
                        )}
                        <small>%</small>
                      </strong>
                      <small>已通过 / 总用例</small>
                    </span>
                  </div>
                  <div className="test-counts">
                    <span>
                      <i className="green-bg" />
                      通过<b>{r.test_summary.passed || 0}</b>
                    </span>
                    <span>
                      <i className="red-bg" />
                      失败<b>{r.test_summary.failed || 0}</b>
                    </span>
                    <span>
                      <i />
                      未完成
                      <b>
                        {Math.max(
                          0,
                          (r.test_summary.total || 0) -
                            (r.test_summary.passed || 0) -
                            (r.test_summary.failed || 0),
                        )}
                      </b>
                    </span>
                  </div>
                </div>
              ) : (
                <Empty text="暂无测试结果" />
              )}
            </section>
          </div>
        ) : tab === "stages" ? (
          <div className="stage-list">
            {stages.map((name) => {
              const s = d.stages.find((s) => s.name === name);
              return (
                <StageDetails
                  key={name}
                  name={name}
                  runId={runId}
                  stage={s}
                  status={name === fault ? faultStatus : s?.status || "pending"}
                  selected={name === selectedStage}
                  targetRef={name === focusedStage ? stageTarget : undefined}
                />
              );
            })}
          </div>
        ) : tab === "artifacts" ? (
          <section className="panel">
            <div className="panel-title">
              <h2>任务产物</h2>
            </div>
            {d.stages.flatMap((s) =>
              (s.artifacts || []).map((a, i) => (
                <div className="artifact-row" key={s.name + i}>
                  <span className="file-icon">
                    <Box size={20} />
                  </span>
                  <div>
                    <b>{a.name}</b>
                    <small>
                      {[stageLabels[s.name], a.size].filter(Boolean).join(" · ")}
                    </small>
                  </div>
                  <ArtifactAction artifact={a} />
                </div>
              )),
            )}
            {!d.stages.some((s) => s.artifacts?.length) && (
              <Empty text="暂无产物" />
            )}
          </section>
        ) : (
          <JsonPanel value={d.manifest} />
        )}
      </div>
      {confirm && (
        <div className="modal-backdrop">
          <section className="modal">
            <h2>删除这个任务？</h2>
            <p>任务 {runId} 的记录将被删除，此操作无法撤销。</p>
            <ErrorBox error={remove.error} />
            <div className="actions">
              <button className="button" onClick={() => setConfirm(false)}>
                取消
              </button>
              <button
                className="button danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                确认删除
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
