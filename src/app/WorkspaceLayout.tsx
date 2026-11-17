import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { ErrorBox } from "../components/Feedback";
import { ThemeMenu } from "../components/ThemeMenu";
import { api, isDemo } from "../lib/api";
import { taskListReturnOptions } from "../lib/taskListNavigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronRight,
  CircleHelp,
  Cpu,
  Layers,
  ListTodo,
  Plus,
  X,
} from "lucide-react";

function toggleEnvironment() {
  localStorage.setItem("tee-mode", isDemo ? "live" : "demo");
  location.reload();
}

export function WorkspaceLayout() {
  const { pathname: path, state } = useLocation();
  const isHome = path === "/";
  const [navigation, setNavigation] = useState<{
    path: string;
    motion?: "enter" | "return" | "peer";
  }>({ path });
  const isTaskDetail = path.startsWith("/tasks/");
  const taskListReturn = isTaskDetail ? taskListReturnOptions(state.taskListOrigin) : {};
  const isSubmit = path === "/submit";
  const pageTitle =
    path === "/hardware"
      ? "硬件资源"
      : isSubmit
        ? "发布任务"
        : isTaskDetail
          ? "任务详情"
          : "任务中心";
  if (navigation.path !== path) {
    const motion = isTaskDetail
      ? "enter"
      : navigation.path.startsWith("/tasks/") && path === "/tasks"
        ? "return"
        : "peer";
    setNavigation({ path, motion });
  }
  const [help, setHelp] = useState(false);
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  const environmentAction = isDemo ? "切换真实接口" : "切换演示数据";
  const environmentLabel = isDemo ? "演示环境" : "真实接口";
  return (
    <div className={isHome ? "app app-home" : "app"}>
      <header className="workspace-header">
        <Link
          to="/"
          className="brand"
          aria-label="TEE Pipeline · 返回首页"
          activeOptions={{ exact: true }}
        >
          <span className="brand-icon">
            <Layers size={17} aria-hidden="true" />
          </span>
          <span>
            TEE <b>Pipeline</b>
          </span>
        </Link>
        <div className="workspace-header-actions">
          <button
            type="button"
            className="workspace-environment-switch"
            aria-label={`${environmentLabel} · ${environmentAction}`}
            title={environmentAction}
            onClick={toggleEnvironment}
          >
            {environmentLabel}
            <ArrowLeftRight size={14} aria-hidden="true" />
          </button>
          <ThemeMenu />
        </div>
      </header>
      <aside className="sidebar">
        <nav aria-label="工作台">
          <Link
            to="/tasks"
            {...taskListReturn}
            className={path.startsWith("/tasks") ? "active" : ""}
          >
            <ListTodo size={18} aria-hidden="true" />
            任务中心
          </Link>
          <Link to="/hardware" className={path === "/hardware" ? "active" : ""}>
            <Cpu size={18} aria-hidden="true" />
            硬件资源
          </Link>
          <Link to="/submit" className={path === "/submit" ? "active" : ""}>
            <Plus size={18} aria-hidden="true" />
            发布任务
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <button className="help" onClick={() => setHelp(true)}>
            <CircleHelp size={16} aria-hidden="true" />
            使用说明
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          <div className="profile">
            <span className="avatar">U</span>
            <div className="profile-name">{me.data?.label || "当前用户"}</div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="shell">
        <main className={isHome ? "home-main" : undefined}>
          {!isHome && (
            <header className="workspace-page-heading">
              <h1>{pageTitle}</h1>
              {isTaskDetail && (
                <Link to="/tasks" {...taskListReturn} className="workspace-page-return" aria-label="返回任务中心">
                  <ArrowLeft size={14} aria-hidden="true" /> 任务中心
                </Link>
              )}
            </header>
          )}
          {!isHome && <ErrorBox error={me.error} />}
          <div key={path} data-page-motion={isHome ? undefined : navigation.motion}>
            <Outlet />
          </div>
        </main>
        <footer hidden={isHome}>
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
              <X size={18} aria-hidden="true" />
            </button>
            <h2>使用说明</h2>
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
