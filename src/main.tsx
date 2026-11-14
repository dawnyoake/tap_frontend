import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  FileText,
  Folder,
  GitBranch,
  Layers,
  LayoutGrid,
  LoaderCircle,
  Monitor,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Terminal,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  api,
  isDemo,
  stages,
  stageLabels,
  duration,
  type Run,
  type Status,
  type Detail,
} from "./lib/api";
import "./styles/globals.css";
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const names: Record<string, string> = {
  running: "运行中",
  success: "已成功",
  failed: "已失败",
  timeout: "已超时",
  pending: "等待中",
  suspended: "已暂停",
  skipped: "已跳过",
  unknown: "未知",
};
function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status}`}>
      <i />
      {names[status] || status.toUpperCase()}
    </span>
  );
}
function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <div className="error" role="alert">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ) : null;
}
function Empty({ text = "暂无匹配的任务" }: { text?: string }) {
  return (
    <div className="empty">
      <Folder size={30} />
      <p>{text}</p>
    </div>
  );
}
function Loading() {
  return (
    <div className="empty">
      <LoaderCircle className="spin" />
      正在加载…
    </div>
  );
}
function usePolling() {
  const [visible, set] = useState(!document.hidden);
  useEffect(() => {
    const fn = () => set(!document.hidden);
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);
  return visible;
}
function useDevices() {
  const visible = usePolling();
  return useQuery({
    queryKey: ["devices"],
    queryFn: api.devices,
    refetchInterval: visible ? 7000 : false,
  });
}
function App() {
  const path = useLocation().pathname;
  const [help, setHelp] = useState(false);
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/tasks" className="brand">
          <span className="brand-icon">
            <Layers size={22} />
          </span>
          <span>
            TEE <b>Pipeline</b>
            <small>AUTOMATION WORKSPACE</small>
          </span>
        </Link>
        <div className="workspace">
          <span className="workspace-avatar">T</span>
          <div>
            研发工作空间<small>Engineering workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">工作台</div>
        <nav>
          <Link
            to="/tasks"
            className={path.startsWith("/tasks") ? "active" : ""}
          >
            <LayoutGrid size={18} />
            任务中心
          </Link>
          <Link to="/hardware" className={path === "/hardware" ? "active" : ""}>
            <Cpu size={18} />
            硬件资源
          </Link>
          <Link to="/submit" className={path === "/submit" ? "active" : ""}>
            <Plus size={18} />
            发布任务
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="env-card">
            <span className="online-dot" /> {isDemo ? "演示环境" : "接口环境"}
            <small>
              {isDemo ? "当前展示脱敏示例数据" : "连接同源 FastAPI 服务"}
            </small>
            <button
              onClick={() => {
                localStorage.setItem("tee-mode", isDemo ? "live" : "demo");
                location.reload();
              }}
            >
              {isDemo ? "切换真实接口" : "切换演示数据"}
              <ArrowUpRight size={13} />
            </button>
          </div>
          <button className="help" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            使用说明
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <span className="avatar">U</span>
            <div>
              {me.data?.label || "当前用户"}
              <small>研发工程师</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="shell">
        <header className="topbar">
          <span>
            工作空间 <ChevronRight size={13} />{" "}
            <b>
              {path === "/hardware"
                ? "硬件资源"
                : path === "/submit"
                  ? "发布任务"
                  : "任务中心"}
            </b>
          </span>
          <span className="top-right">
            <button
              className="demo-tag"
              title="切换演示与真实接口"
              onClick={() => {
                localStorage.setItem("tee-mode", isDemo ? "live" : "demo");
                location.reload();
              }}
            >
              {isDemo ? "DEMO · 演示数据" : "LIVE · 真实接口"}
            </button>
            <span className="divider" />
            <span className="online-dot" />
            <span>TEE 自动化流水线</span>
          </span>
        </header>
        <main>
          <ErrorBox error={me.error} />
          <Outlet />
        </main>
        <footer>
          <span>
            TEE Pipeline <span className="footer-dot">·</span>{" "}
            让每一次交付，都井然有序。
          </span>
          <span className="font-credit">
            使用 HarmonyOS Sans · JetBrains Mono
          </span>
        </footer>
      </div>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-button close"
              onClick={() => setHelp(false)}
              aria-label="关闭"
            >
              <X />
            </button>
            <div className="eyebrow">GETTING STARTED</div>
            <h2>从代码到验证，一站完成。</h2>
            <p>1. 发布任务：选择配置、样机和测试范围。</p>
            <p>2. 任务中心：跟踪七个阶段，查看日志与产物。</p>
            <p>3. 硬件资源：确认设备在线状态与占用情况。</p>
            <div className="notice">
              演示环境不会发送任务到后端。切换真实接口后，请确保 FastAPI
              已启动并配置代理。
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Progress({ run }: { run: Run }) {
  return (
    <div className="progress-cell">
      <div className={`progress-segments ${run.verdict}`}>
        {stages.map((s, i) => (
          <i
            key={s}
            className={
              i < run.progress.done
                ? "done"
                : s === run.current_stage
                  ? "current"
                  : ""
            }
          />
        ))}
      </div>
      <span>
        {run.progress.done}
        <em> / {run.progress.total}</em>
      </span>
    </div>
  );
}
function Pipeline({
  detail,
  compact = false,
}: {
  detail: Detail;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "pipeline vertical" : "pipeline"}>
      {stages.map((name, i) => {
        const s = detail.stages.find((s) => s.name === name);
        return (
          <div className={`pipeline-step ${s?.status || "pending"}`} key={name}>
            <span className="step-node">
              {s?.status === "success" ? (
                <Check size={14} />
              ) : s?.status === "running" ? (
                <LoaderCircle size={14} className="spin" />
              ) : s?.status === "failed" ? (
                <X size={14} />
              ) : (
                i + 1
              )}
            </span>
            <div>
              <strong>{stageLabels[name]}</strong>
              <small>{name.charAt(0).toUpperCase() + name.slice(1)}</small>
            </div>
            <span className="step-time">
              {s?.duration
                ? duration(s.duration)
                : names[s?.status || "pending"]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
function Tasks() {
  const search = useLocation().search as Record<string, unknown>;
  const navigate = useNavigate();
  const q = String(search.q || "");
  const filter = String(search.verdict || "all");
  const sort = String(search.sort || "newest");
  const mine = search.mine !== false && search.mine !== "false";
  const [selected, setSelected] = useState("");
  const visible = usePolling();
  const params = new URLSearchParams({
    q,
    sort,
    ...(filter !== "all" ? { verdict: filter } : {}),
    ...(mine ? { mine: "true" } : {}),
  });
  const result = useQuery({
    queryKey: ["runs", params.toString()],
    queryFn: () => api.runs("?" + params),
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
  const detail = useQuery({
    queryKey: ["detail", chosen?.run_id],
    queryFn: () => api.detail(chosen!.run_id),
    enabled: !!chosen,
    refetchInterval: (query) =>
      visible && query.state.data?.is_running ? 2000 : false,
  });
  const update = (value: Record<string, unknown>) =>
    navigate({ to: "/tasks", search: { ...search, ...value } });
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORK, IN FOCUS"
        title="任务中心"
        description="找到你的任务，继续关注每一次构建与验证。"
      >
        <button className="button" onClick={() => result.refetch()}>
          <RefreshCw size={15} className={result.isFetching ? "spin" : ""} />
          刷新
        </button>
        <Link to="/submit" className="button primary">
          <Plus size={17} />
          发布任务
        </Link>
      </PageHeading>
      <div className="workspace-grid">
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
                <button aria-label="清空搜索" onClick={() => update({ q: "" })}>
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
                    {names[s]}
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
                  onMouseEnter={() => setSelected(run.run_id)}
                  onFocus={() => setSelected(run.run_id)}
                >
                  <span className="run-title">
                    <strong>{run.run_id}</strong>
                    <small>
                      <GitBranch size={12} />
                      {run.branch}
                      <i />
                      {run.platform}
                    </small>
                  </span>
                  <span>
                    <Badge status={run.verdict} />
                  </span>
                  <span>
                    <Progress run={run} />
                    <small className="stage-caption">
                      {run.verdict === "success"
                        ? "全部阶段完成"
                        : stageLabels[run.current_stage]}
                    </small>
                  </span>
                  <span className="mono time">{duration(run.duration)}</span>
                  <ChevronRight size={15} />
                </Link>
              ))}
            </div>
          )}
          <div className="table-footer">
            <span>
              {mine ? "我的任务" : "全部任务"} · {runs.length} 条记录
            </span>
            <span>
              {isDemo ? "脱敏示例 · 非实时任务" : "已连接后端任务列表"}
            </span>
          </div>
        </section>
        <aside className="panel summary-panel">
          <div className="panel-title">
            <h2>任务速览</h2>
            <Box size={17} />
          </div>
          {chosen ? (
            <>
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
                {detail.data?.stages.find((stage) => stage.error)?.error && (
                  <ErrorBox
                    error={
                      detail.data.stages.find((stage) => stage.error)?.error
                    }
                  />
                )}
              </div>
              <ErrorBox error={detail.error} />
              <Link
                to="/tasks/$runId"
                params={{ runId: chosen.run_id }}
                className="button full"
              >
                查看任务详情
                <ArrowRight size={15} />
              </Link>
            </>
          ) : (
            <Empty text="选择任务查看详情" />
          )}
        </aside>
      </div>
      <div className="bottom-note">
        <Zap size={14} />
        <span>点击任务直接查看详情，状态会自动更新。</span>
        <span>构建 · 烧录 · 测试</span>
      </div>
    </>
  );
}
function TaskDetail() {
  const { runId } = detailRoute.useParams();
  const search = useLocation().search as Record<string, unknown>;
  const tab = String(search.tab || "overview");
  const navigate = useNavigate();
  const visible = usePolling();
  const detail = useQuery({
    queryKey: ["detail", runId],
    queryFn: () => api.detail(runId),
    refetchInterval: (q) =>
      visible && q.state.data?.is_running ? 2000 : false,
  });
  const [confirm, setConfirm] = useState(false);
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
      <PageHeading
        eyebrow="RUN DETAILS"
        title={r.task || "任务详情"}
        description={runId}
      >
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
            <div className="config-note">
              <Code2 size={18} />
              <div>
                <b>全流程自动化</b>
                <p>
                  Prepare → Build → Upload → Publish → Trigger → Flash → Test
                </p>
              </div>
            </div>
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
                    } as React.CSSProperties
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
              <Empty text="暂无测试结果，测试完成后将在此展示" />
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
            <span className="subtle">按阶段归档</span>
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
      )}{" "}
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
async function copy(text: string, set: (s: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    set("已复制");
  } catch {
    set("复制失败，请手动选择文本");
  }
  setTimeout(() => set(""), 2500);
}
function JsonPanel({ value }: { value: unknown }) {
  const [msg, set] = useState("");
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>原始 Manifest</h2>
        <button
          className="button"
          onClick={() => copy(JSON.stringify(value, null, 2), set)}
        >
          <Copy size={14} />
          {msg || "复制 JSON"}
        </button>
      </div>
      <pre className="json-panel">{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}
function Logs({ detail }: { detail: Detail }) {
  const [stage, setStage] = useState(
    detail.run_info.current_stage || "prepare",
  );
  const [expanded, setExpanded] = useState(false);
  const [auto, setAuto] = useState(true);
  const [msg, set] = useState("");
  const ref = useRef<HTMLPreElement>(null);
  const log = useQuery({
    queryKey: ["log", detail.run_id, stage],
    queryFn: () => api.log(detail.run_id, stage),
    enabled: expanded,
  });
  const text = expanded
    ? log.data || "加载中…"
    : detail.stages.find((s) => s.name === stage)?.log_tail || "暂无日志";
  useEffect(() => {
    if (auto && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, auto]);
  return (
    <section className="panel log-panel">
      <div className="panel-title">
        <h2>
          <Terminal size={17} />
          运行日志
        </h2>
        <div className="log-actions">
          <select
            aria-label="日志阶段"
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              setExpanded(false);
            }}
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {stageLabels[s]}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="复制日志"
            onClick={() => copy(text, set)}
          >
            <Copy size={16} />
          </button>
          {!isDemo && (
            <a
              className="icon-button"
              aria-label="下载日志"
              href={`/api/log?download=1&run=${encodeURIComponent(detail.run_id)}&stage=${stage}`}
            >
              <ArrowDownToLine size={17} />
            </a>
          )}
        </div>
      </div>
      <ErrorBox error={log.error} />
      <div className="log-meta">
        <span className="mono">
          {stage}.log <span> / {expanded ? "完整日志" : "尾部预览"}</span>
        </span>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
          />
          自动滚动
        </label>
      </div>
      <pre ref={ref} className="terminal main-terminal">
        {text}
      </pre>
      <div className="table-footer">
        <span role="status">{msg || "日志内容按原始文本显示"}</span>
        <button className="text-button" onClick={() => setExpanded(!expanded)}>
          {expanded ? "收起完整日志" : "加载完整日志"}
          <ArrowDown size={14} />
        </button>
      </div>
    </section>
  );
}
function Hardware() {
  const result = useDevices();
  const [filter, setFilter] = useState("all");
  const devices = result.data?.devices || [];
  return (
    <>
      <PageHeading
        eyebrow="HARDWARE RESOURCES"
        title="硬件资源"
        description="设备状态一目了然，让每次测试都有准备。"
      >
        <button className="button" onClick={() => result.refetch()}>
          <RefreshCw size={15} className={result.isFetching ? "spin" : ""} />
          刷新设备
        </button>
        <Link to="/submit" className="button primary">
          <Plus size={16} />
          发布任务
        </Link>
      </PageHeading>
      <div className="hardware-overview panel">
        <div className="host-icon">
          <Monitor size={26} />
        </div>
        <div>
          <h3>{result.data?.ssh_host || "设备主机"}</h3>
          <p>SSH 设备资源池</p>
        </div>
        <div className="host-stat">
          <strong>{devices.length}</strong>
          <span>全部设备</span>
        </div>
        <div className="host-stat">
          <strong className="green">
            {
              devices.filter(
                (d) => !d.busy && d.state !== "offline" && !d.uncertain,
              ).length
            }
          </strong>
          <span>可用设备</span>
        </div>
        <div className="host-stat">
          <strong className="blue">
            {devices.filter((d) => d.busy).length}
          </strong>
          <span>正在使用</span>
        </div>
        <span className="subtle host-update">
          <span className="online-dot" />每 7 秒自动刷新
          <br />
          {result.data?.server_time}
        </span>
      </div>
      <ErrorBox error={result.error || result.data?.error} />
      <div className="device-heading">
        <div className="filter-tabs">
          <div>
            {[
              ["all", "全部设备"],
              ["idle", "可用"],
              ["busy", "占用中"],
              ["offline", "离线"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={filter === key ? "selected" : ""}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <span className="subtle">设备在烧录或测试期间会自动锁定</span>
      </div>
      {result.isLoading ? (
        <Loading />
      ) : (
        <div className="devices-grid">
          {devices
            .filter(
              (d) =>
                filter === "all" ||
                (filter === "idle" &&
                  !d.busy &&
                  d.state !== "offline" &&
                  !d.uncertain) ||
                (filter === "busy" && d.busy) ||
                (filter === "offline" && d.state === "offline"),
            )
            .map((d) => (
              <section
                className={`panel device-card ${d.state === "offline" ? "offline-device" : ""}`}
                key={d.sn}
              >
                <div className="device-card-top">
                  <span className="device-icon">
                    <Cpu size={24} />
                  </span>
                  <Badge status={d.state} />
                </div>
                <h3 className="mono">{d.sn}</h3>
                <p>
                  样机设备 <span>·</span> {d.raw_state}
                </p>
                <div className="device-status">
                  <span>
                    <i
                      className={
                        d.busy
                          ? "blue-bg"
                          : d.state === "offline"
                            ? ""
                            : "green-bg"
                      }
                    />
                    {d.busy
                      ? "任务占用中"
                      : d.state === "offline"
                        ? "设备离线"
                        : d.uncertain
                          ? "状态待确认"
                          : "空闲可用"}
                  </span>
                  <span>{stageLabels[d.busy_stage] || "—"}</span>
                </div>
                {d.uncertain ? (
                  <div className="warning compact">
                    设备锁状态不确定，请检查后再使用。
                  </div>
                ) : d.busy ? (
                  <Link
                    to="/tasks/$runId"
                    params={{ runId: d.busy_by }}
                    className="device-link"
                  >
                    {d.busy_by}
                    <ArrowUpRight size={14} />
                  </Link>
                ) : (
                  <span className="device-link subtle">
                    {d.state === "offline"
                      ? "等待设备重新连接"
                      : "准备就绪，可分配任务"}
                    <Check size={14} />
                  </span>
                )}
              </section>
            ))}
        </div>
      )}
    </>
  );
}
function Submit() {
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
  const submit = useMutation({
    mutationFn: api.submit,
    onSuccess: ({ run_id }) => {
      client.invalidateQueries({ queryKey: ["runs"] });
      navigate({ to: "/tasks/$runId", params: { runId: run_id } });
    },
  });
  return (
    <>
      <PageHeading
        eyebrow="CREATE A PIPELINE"
        title="发布任务"
        description="配置一次，自动完成从构建到测试的完整流程。"
      >
        <span className="subtle">
          <span className="online-dot" />
          {isDemo ? "演示发布，不会触发真实流水线" : "任务由后端识别当前身份"}
        </span>
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
              sn: sn
                .split(/[,，\n]/)
                .map((s) => s.trim())
                .filter(Boolean),
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
                <span>01</span>
                <div>
                  <h2>基础配置</h2>
                  <p>选择流水线配置与代码来源</p>
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
                <span>02</span>
                <div>
                  <h2>设备与测试</h2>
                  <p>指定测试样机和需要验证的范围</p>
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
                      className={sn.includes(d.sn) ? "selected" : ""}
                      onClick={() =>
                        setSN((old) => {
                          const values = old
                            .split(/[,，]/)
                            .map((s) => s.trim())
                            .filter(Boolean);
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
                <span>03</span>
                <div>
                  <h2>备注</h2>
                  <p>为本次运行留下必要的上下文</p>
                </div>
              </div>
              <textarea
                aria-label="备注"
                rows={3}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="例如：本次验证的目标或需要关注的问题…"
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
                {stages.map((s, i) => (
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
                    <span className="stage-number">0{i + 1}</span>
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
                className="button primary full"
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
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="button ghost full"
                onClick={reset}
              >
                重置配置
              </button>
            </section>
            <div className="submit-hint">
              <CircleHelp size={17} />
              <p>
                任务发布后将自动进入执行队列，可在任务详情中实时查看进度与日志。
              </p>
            </div>
          </aside>
        </div>
      </form>
    </>
  );
}
const rootRoute = createRootRoute({ component: App });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Tasks,
});
const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: Tasks,
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    verdict: typeof s.verdict === "string" ? s.verdict : "all",
    sort: typeof s.sort === "string" ? s.sort : "newest",
    mine: s.mine !== false && s.mine !== "false",
  }),
});
const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks/$runId",
  component: TaskDetail,
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : "overview",
  }),
});
const submitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/submit",
  component: Submit,
});
const hardwareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hardware",
  component: Hardware,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([
    indexRoute,
    tasksRoute,
    detailRoute,
    submitRoute,
    hardwareRoute,
  ]),
  defaultNotFoundComponent: () => (
    <Empty text="页面不存在，请从左侧导航返回工作台" />
  ),
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
