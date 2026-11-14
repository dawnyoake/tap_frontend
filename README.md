# TEE Pipeline 前端

基于 `info.md` 的 React + TypeScript + Vite 工作台，使用 TanStack Router、TanStack Query、Tailwind CSS 及 Lucide 图标。组件采用简洁的 shadcn 风格，未引入不必要的组件框架。

## 启动

```bash
git clone git@github.com:dawnyoake/tap_frontend.git
cd tap_frontend
npm install
npm run dev
```

构建：`npm run build`，输出目录 `dist/`。生产服务器需将 `/tasks/*`、`/submit`、`/hardware` 等 SPA 路由回退到 `index.html`，并保留 `/api` 与 `/download` 的后端路由。

## 演示与接口

默认展示明确标记的脱敏演示数据。桌面侧栏可切换真实接口模式。窄屏可点击顶部 DEMO / LIVE 标签切换。演示提交与删除只修改内存，不会请求后端，刷新后还原。

真实模式请求文档约定的同源路径；开发代理位于 `vite.config.ts`，默认转发到 `http://127.0.0.1:8000`。请求失败会显示错误，不自动降级为演示数据。

接手开发请先看 [交接说明](HANDOFF.md)，其中列出了页面入口、接口边界和验证步骤。

轮询：任务列表 15 秒；运行中详情 2 秒；设备 7 秒；页面隐藏时暂停。任务中心默认展示我的任务，可切换全部任务。点击任务整行直接进入详情，悬停或聚焦可更新右侧简要信息。搜索、状态、排序、任务范围、详情 tab 均保存在 URL。日志展开时才请求完整日志。

## 对接边界

当前身份来自 `/api/me`，只用于展示和筛选，提交不发送 owner。服务端仍负责鉴权与删除权限。登录扩展可放到 QueryClient / Router 外层 provider 和请求封装中。

文档未定义完整 artifact / test_summary / manifest 子结构，目前分别按 `name/size/url/download/path`、`passed/failed/total` 展示，需要对接时核实并在客户端做适配。没有链接的演示产物明确禁用下载；Windows 打开目录未实现，避免凭空构造路径。完整日志以文本显示，极大日志的流式分块 / 虚拟化留待后端契约确认。没有进行真实后端联调。

## 字体与视觉

中文采用 HarmonyOS Sans SC，西文、数字和日志采用 JetBrains Mono，均本地托管。中文字体用于接近终末地的黑体阅读气质，未声称与官方游戏字体完全一致。保留原始字体文件与许可，字体来源和设计尺寸见 `DESIGN.md`。

此仓库根目录对应原工作空间的 `frontend/` 目录。
