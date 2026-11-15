# TEE Pipeline 前端交接

这是 Vite 构建的 React + TypeScript 单页应用。TanStack Router 管路由和 URL 筛选，TanStack Query 管服务端数据、轮询与缓存，页面用 React 状态保存表单和交互。样式用 CSS，Tailwind 提供基础样式，图标来自 Lucide。

| 需要改什么 | 去哪里 |
| --- | --- |
| 应用启动及 Query 默认配置 | `src/main.tsx` |
| 路由、筛选参数和详情默认标签 | `src/app/router.tsx` |
| 导航、外观菜单、演示模式切换 | `src/app/WorkspaceLayout.tsx`、`src/components/ThemeMenu.tsx` |
| 任务列表、阶段详情、设备、发布表单 | `src/pages/` 中的对应页面 |
| 状态标签、进度、日志、通用反馈 | `src/components/` |
| 可见性控制和共享设备查询 | `src/hooks/queries.ts` |
| 字段及提交载荷类型 | `src/lib/contracts.ts` |
| 真实 API 和错误处理 | `src/lib/api.ts` |
| 脱敏示例和演示提交、删除 | `src/lib/demoApi.ts` |
| 主题、字体、响应式布局 | `src/styles/` 和各页面旁的 CSS |

在仓库根目录运行 `npm ci`、`npm run dev`。提交前运行 `npm run build`，它会执行 TypeScript 检查并打包到 `dist/`。生产部署需给 SPA 路由配置 `index.html` 回退，并保留同源 `/api` 和 `/download`。Vite 开发代理默认指向 `127.0.0.1:8000`。

接口规格先读 [info.md](info.md)。页面依赖同一个 `PipelineApi` 接口，真实和演示实现都遵循它。默认进入演示模式，数据在内存中，刷新重置。切到 LIVE 才会请求 FastAPI。真实模式把任务筛选交给后端，演示模式在页面本地筛选。发布、删除成功后会让任务列表缓存重新加载。新增字段先确认后端契约，再改类型和展示。真实部署的身份识别、鉴权和删除权限由服务端负责。

接手后可在演示环境核对四条路径。任务中心切换范围或状态时保留滚动位置，下载列按需读取产物，失败或超时任务的定位链接会展开对应阶段。阶段详情点击「完整日志」时请求全文。设备页可切换卡片密度并记住偏好。发布页按所选执行阶段显示配置卡片，提交后进入新任务详情。浏览器还应检查深浅色和窄屏布局。

改视觉时优先复用全局颜色和间距变量，检查断点覆盖。真实接口沿用 `info.md` 记录的路由。设备元数据字段与跳过环境准备时的代码来源见 [README](README.md) 中的对接边界。真实 FastAPI 联调待完成。
