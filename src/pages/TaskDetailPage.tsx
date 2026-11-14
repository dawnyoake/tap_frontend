import { useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRouteApi,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { Badge } from "../components/StatusBadge";
import { Empty, ErrorBox, Loading } from "../components/Feedback";
import { PageHeading } from "../components/PageHeading";
import { Pipeline } from "../components/RunProgress";
import { Logs, JsonPanel } from "../components/RunLogs";
import { usePolling } from "../hooks/queries";
import { api, isDemo, stages, stageLabels, duration } from "../lib/api";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  Box,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";

export function TaskDetailPage() {
  const { runId } = getRouteApi("/tasks/$runId").useParams() as {
    runId: string;
  };
  const search = useLocation().search as Record<string, unknown>;
  const tab = String(search.tab || "stages");
  const navigate = useNavigate();
  const visible = usePolling();
  const detail = useQuery({
    queryKey: ["detail", runId],
    queryFn: () => api.detail(runId),
    refetchInterval: (q) =>
      visible && q.state.data?.is_running ? 2000 : false,
  });
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
  return (
    <>
      <Link to="/tasks" className="back-link">
        <ArrowLeft size={14} />
        返回任务中心
      </Link>
      <PageHeading title={r.task || "任务详情"} description={runId}>
        <Badge status={r.verdict} />
        <button className="button" onClick={() => detail.refetch()}>
          <RefreshCw size={15} />
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
      </PageHeading>
      <ErrorBox error={detail.error} />
      <section className="panel detail-banner">
        <div className="detail-metrics">
          <span>
            执行进度
            <strong>
              {r.progress.done}
              <small> / {r.progress.total}</small>
            </strong>
          </span>
          <span>
            当前阶段<strong>{stageLabels[r.current_stage] || "—"}</strong>
          </span>
          <span>
            运行耗时<strong className="mono">{duration(r.duration)}</strong>
          </span>
          <span>
            提交者<strong>{r.owner || "—"}</strong>
          </span>
        </div>
        <Pipeline detail={d} />
      </section>
      <div className="detail-tabs">
        {[
          ["overview", "概览"],
          ["stages", "阶段详情"],
          ["logs", "运行日志"],
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
                <section className="panel stage-panel" key={name}>
                  <div className="panel-title">
                    <h2>
                      {stageLabels[name]}
                      <small>{name}</small>
                    </h2>
                    <span className="stage-actions">
                      {duration(s?.duration || 0)}
                      <Badge status={s?.status || "pending"} />
                    </span>
                  </div>
                  <ErrorBox error={s?.error} />
                  <details>
                    <summary>阶段参数</summary>
                    <pre>{JSON.stringify(s?.params || {}, null, 2)}</pre>
                  </details>
                  <details>
                    <summary>日志预览</summary>
                    <pre className="terminal">{s?.log_tail || "暂无日志"}</pre>
                  </details>
                </section>
              );
            })}
          </div>
        ) : tab === "logs" ? (
          <Logs detail={d} />
        ) : tab === "artifacts" ? (
          <section className="panel">
            <div className="panel-title">
              <h2>构建产物</h2>
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
                      {stageLabels[s.name]} · {a.size || "大小未知"}
                    </small>
                  </div>
                  {a.download || a.url ? (
                    <a className="button" href={a.download || a.url}>
                      <ArrowDownToLine size={15} />
                      下载
                    </a>
                  ) : (
                    <span className="subtle">
                      {isDemo ? "演示产物，无下载文件" : "暂无下载链接"}
                    </span>
                  )}
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
