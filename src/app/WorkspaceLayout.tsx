import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { ErrorBox } from "../components/Feedback";
import { ThemeMenu } from "../components/ThemeMenu";
import { api, isDemo } from "../lib/api";
import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  Cpu,
  House,
  Layers,
  LayoutGrid,
  Plus,
  X,
} from "lucide-react";

export function WorkspaceLayout() {
  const path = useLocation().pathname;
  const isHome = path === "/";
  const [navigation, setNavigation] = useState<{
    path: string;
    motion?: "enter" | "return" | "peer";
  }>({ path });
  const isTaskDetail = path.startsWith("/tasks/");
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
  return (
    <div className={isHome ? "app app-home" : "app"}>
      <aside className="sidebar">
        <Link
          to="/"
          className="brand"
          aria-label="TEE Pipeline · 返回首页"
          activeOptions={{ exact: true }}
        >
          <span className="brand-icon">
            <Layers size={22} />
          </span>
          <span>
            TEE <b>Pipeline</b>
          </span>
        </Link>
        <nav aria-label="工作台">
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
            <div>{me.data?.label || "当前用户"}</div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="shell">
        <header className="topbar" hidden={isHome}>
          <div
            className={isTaskDetail ? "breadcrumbs breadcrumbs-detail" : "breadcrumbs"}
            role="navigation"
            aria-label="页面位置"
          >
            <Link
              to="/"
              className="breadcrumb-home"
              aria-label="工作空间 · 返回首页"
            >
              <House size={15} aria-hidden="true" />
              <span>工作空间</span>
            </Link>
            <ChevronRight size={13} aria-hidden="true" />
            {isTaskDetail && (
              <>
                <Link to="/tasks" className="breadcrumb-parent">
                  任务中心
                </Link>
                <ChevronRight size={13} aria-hidden="true" />
              </>
            )}
            <h1 aria-current="page">{pageTitle}</h1>
          </div>
          <div className="top-right">
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
            <ThemeMenu />
          </div>
        </header>
        <main className={isHome ? "home-main" : undefined}>
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
              <X />
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
