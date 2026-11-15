import { useId, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Badge, statusLabels } from "../components/StatusBadge";
import { Empty, ErrorBox, Loading } from "../components/Feedback";
import { Progress } from "../components/RunProgress";
import { usePolling } from "../hooks/queries";
import { api, isDemo, stageLabels, duration, type Run } from "../lib/api";
import { artifactDownloadHref } from "../lib/artifacts";
import { findFaultStage } from "../lib/runStages";
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronDown,
  FileText,
  GitBranch,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

function RunDownloads({ run }: { run: Run }) {
  const popoverId = useId();
  const [expanded, setExpanded] = useState(false);
  const detail = useQuery({
    queryKey: ["detail", run.run_id],
    queryFn: () => api.detail(run.run_id),
    enabled: expanded,
  });
  const source = detail.data?.stages ?? run.stages ?? [];
  const files = [...source]
    .sort((a, b) => Number(b.name === "test") - Number(a.name === "test"))
    .flatMap((stage) => (stage.artifacts ?? []).map((artifact) => ({
      artifact,
      stage: stage.name,
      href: artifactDownloadHref(artifact),
    })));

  return (
    <>
      <button
        type="button"
        className="run-download-toggle"
        aria-label={`${expanded ? "收起" : "查看"} ${run.run_id} 的下载产物`}
        aria-expanded={expanded}
        popoverTarget={popoverId}
      >
        <ArrowDownToLine size={14} aria-hidden="true" />产物
        <ChevronDown className="run-download-chevron" size={12} aria-hidden="true" />
      </button>
      <div
        id={popoverId}
        popover="auto"
        className="run-downloads"
        role="region"
        aria-label={`任务 ${run.run_id} 的下载产物`}
        onToggle={(event) => setExpanded(event.currentTarget.matches(":popover-open"))}
      >
        <ErrorBox error={detail.error} />
        {files.length ? (
          <ul>
            {files.map(({ artifact, stage, href }, index) => {
              const info = (
                <span className="run-download-file">
                  <b>{artifact.name}</b>
                  <small>{[stageLabels[stage] || stage, artifact.size].filter(Boolean).join(" · ")}</small>
                  {!href && <small>{isDemo ? "演示占位文件" : "暂无下载链接"}</small>}
                </span>
              );
              return (
                <li key={index}>
                  {href ? (
                    <a className="run-download-option" href={href} download aria-label={`下载 ${artifact.name}`}>
                      <FileText size={16} aria-hidden="true" />
                      {info}
                      <ArrowDownToLine size={15} aria-hidden="true" />
                    </a>
                  ) : (
                    <div className="run-download-option unavailable">
                      <FileText size={16} aria-hidden="true" />
                      {info}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : detail.isPending ? (
          <p className="subtle" role="status">正在加载产物…</p>
        ) : !detail.error && (
          <p className="subtle">暂无可下载产物</p>
        )}
      </div>
    </>
  );
}

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
    <section className="panel tasks-panel">
      <div className="panel-title task-list-toolbar">
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
        <div className="content-actions">
          <button className="button" onClick={() => result.refetch()}>
            <RefreshCw size={15} className={result.isFetching ? "spin" : ""} />
            刷新
          </button>
          <Link to="/submit" className="button primary cta">
            <Plus size={17} />
            发布任务
          </Link>
        </div>
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
        <div className={mine ? "task-table" : "task-table task-table-with-owner"}>
          <div className="table-heading">
            <span>任务 / 分支</span>
            {!mine && <span>发布者</span>}
            <span>状态</span>
            <span>执行进度</span>
            <span className="task-cell-time">耗时</span>
            <span className="task-cell-download">下载</span>
          </div>
          {runs.map((run) => {
            const fault = findFaultStage(run);
            const hasArtifacts = run.artifact_count !== 0 || run.stages?.some((stage) => stage.artifacts?.length);
            return (
              <div key={run.run_id}>
                <div className="task-row">
                  <Link
                    to="/tasks/$runId"
                    params={{ runId: run.run_id }}
                    className="run-title run-primary"
                    title={run.task || run.run_id}
                  >
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
                  </Link>
                  {!mine && (
                    <span className="run-owner">
                      <span className="run-mobile-label">发布者</span>
                      {run.owner || "—"}
                    </span>
                  )}
                  <span className="run-status">
                    <Badge status={run.verdict} />
                  </span>
                  <div className="run-progress">
                    <span className="run-mobile-label">执行进度</span>
                    <Progress run={run} />
                    {fault ? (
                      <Link
                        to="/tasks/$runId"
                        params={{ runId: run.run_id }}
                        search={{ tab: "stages", stage: fault }}
                        className="stage-caption run-fault"
                      >
                        定位{stageLabels[fault]}
                        <ArrowUpRight size={12} aria-hidden="true" />
                      </Link>
                    ) : (
                      <small className="stage-caption">
                        {run.verdict === "success" ? "全部阶段完成" : stageLabels[run.current_stage]}
                      </small>
                    )}
                  </div>
                  <span className="run-time task-cell-time mono time">
                    <span className="run-mobile-label">耗时</span>
                    {duration(run.duration)}
                  </span>
                  <div className="run-download">
                    {hasArtifacts ? <RunDownloads run={run} /> : <span className="subtle">暂无产物</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="table-footer">
        <span>
          {mine ? "我的任务" : "全部任务"} · {runs.length} 条记录
        </span>
        <span className="subtle">
          <span className="online-dot" />每 15 秒自动刷新
        </span>
        {isDemo && <span>演示数据</span>}
      </div>
    </section>
  );
}
