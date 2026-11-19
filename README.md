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

默认展示明确标记的脱敏演示数据。桌面侧栏可切换真实接口模式。窄屏可在任务中心、硬件资源或发布页点击顶部 DEMO / LIVE 标签切换。演示提交与删除只修改内存，刷新后还原。

真实模式请求文档约定的同源路径；开发代理位于 `vite.config.ts`，默认转发到 `http://127.0.0.1:8000`。请求失败会显示错误，不自动降级为演示数据。

接手开发请先看 [交接说明](HANDOFF.md)，其中列出了页面入口、接口边界和验证步骤。

首页 `/` 默认使用主题纯色。可用 `/?art=1` 临时预览像素场景。点击首页的「发布任务」进入 `/submit`。

任务列表每 15 秒刷新，运行中的详情每 2 秒刷新，设备每 7 秒刷新。页面隐藏时暂停轮询。任务中心默认展示我的任务，切换到全部任务时显示发布者。点击任务进入详情，下载列按需展开实际产物，失败或超时的任务可以直接定位到阶段。列表筛选、排序和详情页的标签及定位阶段保存在 URL。阶段日志使用尾部预览，点击「完整日志」才加载全文。

## 对接边界

当前身份来自 `/api/me`，只用于展示和筛选，提交不发送 owner。服务端仍负责鉴权与删除权限。登录扩展可放到 QueryClient / Router 外层 provider 和请求封装中。

产物按 `name/size/url/download/path` 展示，路径字段使用现有的 `/download?path=...` 接口。测试概况使用 `passed/failed/total`，Manifest 保留原始展示。设备卡片可读取 `version`、`chip_model`、`product_model` 和 0–100 的 `battery_percent`，缺失时显示占位。跳过环境准备时，Root 代码路径输入仅用于演示，真实提交仍由流水线配置决定代码来源。产品真实后端联调待完成。

## 字体与视觉

中文采用 HarmonyOS Sans SC，西文、数字和日志采用 JetBrains Mono，均本地托管。中文字体用于接近终末地的黑体阅读气质，未声称与官方游戏字体完全一致。保留原始字体文件与许可，字体来源和设计尺寸见 `DESIGN.md`。

此仓库根目录对应原工作空间的 `frontend/` 目录。

## 发布页递进流程与后端契约

发布页按“来源确认 → 资源池样机 → 兼容配置与测试范围 → 发布”展开。
Change-Id 从 trigger 开始且不能跳过 trigger；Root MR 从 prepare 开始。
跳过 flash 并执行 test 时提交 overrides.test.skip_flash=true。最终阶段合法性仍由后端校验。

配置列表需要返回 device_match（字符串数组）或 device_model（字符串）。
匹配忽略大小写，支持双向包含；设备型号为空时不过滤。配置没有匹配元数据时，
对已知型号不会被当作兼容配置。无匹配会展示空状态。示例：

```json
{"configs":[
  {"name":"MLN_Hisi_Adb_All.json","label":"MLN_Hisi_Adb_All","device_model":"MLN","device_match":["MLN"]},
  {"name":"PC.json","label":"PC","device_match":["Charlotte Pro","CPROHarden","HARDEN"]}
]}
```

测试范围调用 GET /api/test-roots?config=<name>&profile=<profile>，
当前前端约定返回 {"roots":["UCrypto/Crypto"]}；切换模板清空选择。
设备协议状态展示使用 raw_state，缺失时使用 state。

本仓仅含前端，没有 web/ 后端与 config/ 配置文件。上述元数据和 roots 响应结构
需要由部署侧后端提供并联调；不会根据配置文件名猜测设备兼容性。
