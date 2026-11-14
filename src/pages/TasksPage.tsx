import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Badge, statusLabels } from "../components/StatusBadge";
import { Empty, ErrorBox, Loading } from "../components/Feedback";
import { PageHeading } from "../components/PageHeading";
import { Progress } from "../components/RunProgress";
import { usePolling } from "../hooks/queries";
import { api, isDemo, stageLabels, duration } from "../lib/api";
import {
  Activity,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  GitBranch,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

export function TasksPage() {
  const search = useLocation().search as Record<string, unknown>;
  const navigate = useNavigate();
  const q = String(search.q || "");
  const filter = String(search.verdict || "all");
  const sort = String(search.sort || "newest");
  const mine = search.mine !== false && search.mine !== "false";
  const filterScroll = useRef<{
    mine: boolean;
    verdict: string;
    top: number;
  } | null>(null);
  useLayoutEffect(() => {
    const target = filterScroll.current;
    if (target?.mine === mine && target.verdict === filter) {
      const frame = requestAnimationFrame(() => {
        filterScroll.current = null;
        window.scrollTo({ top: target.top, behavior: "instant" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [mine, filter]);
  const [selected, setSelected] = useState("");
  const previewTimer = useRef<number | undefined>(undefined);

  function cancelPreview() {
    window.clearTimeout(previewTimer.current);
  }

  useEffect(() => cancelPreview, [q, filter, sort, mine]);
  function previewOnHover(runId: string) {
    cancelPreview();
    // Ignore rows crossed on the way to another target.
    previewTimer.current = window.setTimeout(() => setSelected(runId), 110);
  }
  const visible = usePolling();
  const params = new URLSearchParams({ q, sort });
  const baseKey = params.toString();
  if (filter !== "all") params.set("verdict", filter);
  if (mine) params.set("mine", "true");
  const result = useQuery({
    queryKey: ["runs", baseKey, filter, mine],
    queryFn: () => api.runs("?" + params),
    // Keep the list in place while the new scope or status loads.
    placeholderData: (previous, query) =>
      query?.queryKey[1] === baseKey ? previous : undefined,
    refetchInterval: visible ? 15000 : false,
  });
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  let runs = result.data?.items || [];
  if (isDemo) {
    runs = runs.filter(
      (r) =>
        (filter === "all" || r.verdict === filter) &&
        (!mine || r.owner === me.data?.uid) &&
        [r.run_id, r.task, r.platform, r.branch, r.change_id]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
    );
    runs = [...runs].sort((a, b) =>
      sort === "oldest"
        ? a.run_id.localeCompare(b.run_id)
        : sort === "status"
          ? a.verdict.localeCompare(b.verdict)
          : b.run_id.localeCompare(a.run_id),
    );
  }
  const chosen = runs.find((r) => r.run_id === selected) || runs[0];
  function update(value: {
    q?: string;
    sort?: string;
    mine?: boolean;
    verdict?: string;
  }) {
    const preserveScroll =
      value.mine !== undefined || value.verdict !== undefined;
    if (preserveScroll) {
      const nextMine = value.mine ?? mine;
      const nextVerdict = value.verdict ?? filter;
      if (nextMine === mine && nextVerdict === filter) return;
      filterScroll.current = {
        mine: nextMine,
        verdict: nextVerdict,
        top: window.scrollY,
      };
    } else {
      filterScroll.current = null;
    }
    void navigate({
      to: "/tasks",
      search: { ...search, ...value },
      resetScroll: !preserveScroll,
    });
  }
  return (
    <>
      <PageHeading title="任务中心">
        <button className="button" onClick={() => result.refetch()}>
          <RefreshCw size={15} className={result.isFetching ? "spin" : ""} />
          刷新
        </button>
        <Link to="/submit" className="button primary cta">
          <Plus size={17} />
          发布任务
        </Link>
      </PageHeading>
      <div className="workspace-grid">
        <div className="task-list-column">
          <section className="panel tasks-panel">
            <div className="panel-title">
              <div className="task-scope" role="group" aria-label="任务范围">
                <button
                  className={mine ? "active" : ""}
                  aria-pressed={mine}
                  onClick={() => update({ mine: true })}
                >
                  我的任务
                </button>
                <button
                  className={!mine ? "active" : ""}
                  aria-pressed={!mine}
                  onClick={() => update({ mine: false })}
                >
                  全部任务
                </button>
              </div>
              <span className="subtle">
                <span className="online-dot" />每 15 秒自动刷新
              </span>
            </div>
            <div className="filters">
              <label className="search">
                <Search size={16} />
                <input
                  aria-label="搜索任务"
                  placeholder="搜索任务 ID、分支、平台…"
                  value={q}
                  onChange={(e) => update({ q: e.target.value })}
                />
                {q && (
                  <button
                    aria-label="清空搜索"
                    onClick={() => update({ q: "" })}
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <select
                aria-label="排序"
                value={sort}
                onChange={(e) => update({ sort: e.target.value })}
              >
                <option value="newest">最新优先</option>
                <option value="oldest">最早优先</option>
                <option value="status">按结论</option>
              </select>
            </div>
            <div className="filter-tabs">
              <div>
                {[
                  ["all", "全部状态"],
                  ["running", "运行中"],
                  ["success", "已成功"],
                  ["failed", "已失败"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={filter === id ? "selected" : ""}
                    onClick={() => update({ verdict: id })}
                  >
                    {label}
                  </button>
                ))}
                <select
                  aria-label="更多状态"
                  value={
                    ["all", "running", "success", "failed"].includes(filter)
                      ? ""
                      : filter
                  }
                  onChange={(e) => update({ verdict: e.target.value || "all" })}
                >
                  <option value="">更多</option>
                  {["pending", "timeout", "suspended", "skipped"].map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ErrorBox error={result.error} />
            {result.isLoading ? (
              <Loading />
            ) : runs.length === 0 ? (
              <Empty />
            ) : (
              <div className="task-table">
                <div className="table-heading">
                  <span>任务 / 分支</span>
                  <span>状态</span>
                  <span>执行进度</span>
                  <span>耗时</span>
                  <span />
                </div>
                {runs.map((run) => (
                  <Link
                    to="/tasks/$runId"
                    params={{ runId: run.run_id }}
                    className={`task-row ${chosen?.run_id === run.run_id ? "chosen" : ""}`}
                    key={run.run_id}
                    onMouseEnter={() => previewOnHover(run.run_id)}
                    onMouseLeave={cancelPreview}
                    onFocus={() => {
                      cancelPreview();
                      setSelected(run.run_id);
                    }}
                  >
                    <span className="run-title">
                      <strong>{run.task || run.run_id}</strong>
                      {run.task && run.task !== run.run_id && (
                        <span className="run-id mono">{run.run_id}</span>
                      )}
                      <small className="run-context">
                        <span className="run-branch">
                          <GitBranch size={12} aria-hidden="true" />
                          <span>{run.branch || "—"}</span>
                        </span>
                        {run.platform && (
                          <span className="run-platform">{run.platform}</span>
                        )}
                      </small>
                    </span>
                    <span className="run-status">
                      <Badge status={run.verdict} />
                    </span>
                    <span className="run-progress">
                      <span className="run-mobile-label">执行进度</span>
                      <Progress run={run} />
                      <small className="stage-caption">
                        {run.verdict === "success"
                          ? "全部阶段完成"
                          : stageLabels[run.current_stage]}
                      </small>
                    </span>
                    <span className="run-time mono time">
                      <span className="run-mobile-label">耗时</span>
                      {duration(run.duration)}
                    </span>
                    <span className="task-row-arrows" aria-hidden="true">
                      <ChevronRight size={13} strokeWidth={3} />
                      <ChevronRight size={13} strokeWidth={3} />
                      <ChevronRight size={13} strokeWidth={3} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <div className="table-footer">
              <span>
                {mine ? "我的任务" : "全部任务"} · {runs.length} 条记录
              </span>
              <span>{isDemo && "演示数据"}</span>
            </div>
          </section>
        </div>
        <aside className="panel summary-panel">
          <div className="panel-title">
            <h2>任务速览</h2>
            <Box size={17} />
          </div>
          {chosen ? (
            <>
              <div className="summary-content" key={chosen.run_id}>
                <div className="summary-head">
                  <Badge status={chosen.verdict} />
                  <h3>{chosen.task}</h3>
                  <p className="mono">{chosen.run_id}</p>
                </div>
                <div className="summary-meta">
                  <span>
                    分支
                    <b>
                      <GitBranch size={13} />
                      {chosen.branch}
                    </b>
                  </span>
                  <span>
                    平台<b>{chosen.platform}</b>
                  </span>
                  <span>
                    开始时间<b>{chosen.created_at?.slice(11) || "—"}</b>
                  </span>
                </div>
                <div className="summary-execution">
                  <div className="section-label">
                    执行进度{" "}
                    <span>
                      {chosen.progress.done} / {chosen.progress.total}
                    </span>
                  </div>
                  <Progress run={chosen} />
                  <div className="current-stage-card">
                    <span className={`stage-indicator ${chosen.verdict}`}>
                      {chosen.verdict === "running" ? (
                        <LoaderCircle size={18} className="spin" />
                      ) : chosen.verdict === "success" ? (
                        <Check size={18} />
                      ) : (
                        <Activity size={18} />
                      )}
                    </span>
                    <div>
                      <small>
                        {chosen.verdict === "success" ? "执行完成" : "当前阶段"}
                      </small>
                      <strong>
                        {chosen.verdict === "success"
                          ? "全部阶段已完成"
                          : stageLabels[chosen.current_stage]}
                      </strong>
                    </div>
                  </div>
                  <div className="summary-duration">
                    <span>累计耗时</span>
                    <b>{duration(chosen.duration)}</b>
                  </div>
                </div>
              </div>
              <Link
                to="/tasks/$runId"
                params={{ runId: chosen.run_id }}
                className="button primary cta cta-detail full"
              >
                查看任务详情
                <ArrowRight className="cta-arrow" size={15} />
              </Link>
            </>
          ) : (
            <Empty text="选择任务查看详情" />
          )}
        </aside>
      </div>
    </>
  );
}
