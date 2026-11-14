# TEE Pipeline 前端交接

这是 Vite 构建的 React + TypeScript 单页应用。TanStack Router 管路由和 URL 筛选，TanStack Query 管服务端数据、轮询与缓存，页面用 React 状态保存表单和交互。样式用 CSS，Tailwind 提供基础样式，图标来自 Lucide。

| 需要改什么 | 去哪里 |
| --- | --- |
| 应用启动及 Query 默认配置 | `src/main.tsx` |
| 路由、筛选参数和详情默认标签 | `src/app/router.tsx` |
| 导航、主题、演示模式切换 | `src/app/WorkspaceLayout.tsx` |
| 任务列表、阶段详情、设备、发布表单 | `src/pages/` 中的对应页面 |
| 状态标签、进度、日志、通用反馈 | `src/components/` |
| 可见性控制和共享设备查询 | `src/hooks/queries.ts` |
| 字段及提交载荷类型 | `src/lib/contracts.ts` |
| 真实 API 和错误处理 | `src/lib/api.ts` |
| 脱敏示例和演示提交、删除 | `src/lib/demoApi.ts` |
| 主题、间距、响应式布局 | `src/styles/globals.css` 和 `src/styles/fonts.css` |

在仓库根目录运行 `npm ci`、`npm run dev`。提交前运行 `npm run build`，它会执行 TypeScript 检查并打包到 `dist/`。生产部署需给 SPA 路由配置 `index.html` 回退，并保留同源 `/api` 和 `/download`。Vite 开发代理默认指向 `127.0.0.1:8000`。

接口规格先读 [info.md](info.md)。页面依赖同一个 `PipelineApi` 接口，真实和演示实现都遵循它。默认进入演示模式，数据在内存中，刷新重置。切到 LIVE 才会请求 FastAPI。真实模式把任务筛选交给后端，演示模式在页面本地筛选。发布、删除成功后会让任务列表缓存重新加载。新增字段先确认后端契约，再改类型和展示。真实部署的身份识别、鉴权和删除权限由服务端负责。

接手后可在演示环境核对四条路径。任务中心切换范围或状态时保留滚动位置，点击一行默认进入阶段详情。详情页展开完整日志时才请求日志。设备页可切换卡片密度并记住偏好。发布页选配置、勾选设备、提交后进入新任务详情。浏览器还应检查深浅色和 375 px 布局。

目前样式集中在一个文件，历次迭代有多处断点覆盖。改视觉时优先复用顶部颜色、间距变量，检查目标选择器在后面是否有覆盖。下一步若要开展真实后端对接，先确认 `artifact`、`test_summary`、`manifest` 的实际结构，再增加必要的运行时校验。当前仓库没有自动化端到端测试，也尚未完成真实 FastAPI 联调。
