import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { Empty } from "../components/Feedback";
import { TasksPage } from "../pages/TasksPage";
import { TaskDetailPage } from "../pages/TaskDetailPage";
import { SubmitPage } from "../pages/SubmitPage";
import { HardwarePage } from "../pages/HardwarePage";
import { HomePage } from "../pages/HomePage";
import { stages } from "../lib/contracts";

const rootRoute = createRootRoute({ component: WorkspaceLayout });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
  validateSearch: (search: Record<string, unknown>) => ({
    art: search.art === 1 || search.art === "1" ? 1 : undefined,
  }),
});
const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksPage,
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
  component: TaskDetailPage,
  validateSearch: (s: Record<string, unknown>) => ({
    tab:
      typeof s.tab === "string" &&
      ["overview", "stages", "artifacts", "manifest"].includes(s.tab)
        ? s.tab
        : "stages",
    stage: stages.find((stage) => stage === s.stage),
  }),
});
const submitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/submit",
  component: SubmitPage,
  validateSearch: (search: Record<string, unknown>) => ({
    source: search.source === "change-id" || search.source === "root-mr"
      ? search.source
      : undefined,
  }),
});
const hardwareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hardware",
  component: HardwarePage,
});
export const router = createRouter({
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
