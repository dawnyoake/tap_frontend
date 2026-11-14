# TEE Pipeline 前端现状、目标架构与 API 契约

> 本文档用于交给 ChatGPT/其他前端生成工具使用。  
> 所有示例中的日志、任务名、产品名、路径、SN、主机名、用户标识均已脱敏，不代表真实环境。

---

## 0. 脱敏约定

示例统一使用以下占位符：

| 类型 | 脱敏值 |
|---|---|
| 任务 ID | `run-20261114-001` |
| 产品/任务名 | `product-****` / `task-****` |
| 分支 | `br-****` |
| Change-Id | `I****` |
| 配置名 | `cfg-****.json` |
| 测试 profile | `profile-****` |
| 测试用例 | `TestSuite/****` |
| 设备 SN | `SN-****0817` |
| Windows 主机 | `WIN-HOST-1` |
| Windows 路径 | `D:\TEE-TEST\...` |
| 用户 | `user-****` |
| CMC 目录 | `cmc-****` |
| 日志内容 | `[time] [INFO] stage=**** run_id=run-****` |
| 文件路径 | `/****/****.log` |

日志示例不要出现真实业务名、真实路径、真实 SN、真实 IP、真实 MR 号。

---

# 1. 当前前端现状

## 1.1 实现方式

当前 dashboard 是单文件内嵌前端：

- 后端：FastAPI
- 前端：`web/page.py` 中内嵌 HTML + CSS + 原生 JavaScript
- 无前端构建步骤
- 字体和图标静态资源在 `web/assets/`
- 页面由后端 `GET /` 直接返回

优点：

- 部署简单
- 不需要 Node 工具链
- 与 FastAPI 同源，无 CORS
- 适合内部工具快速迭代

缺点：

- 单文件过大
- 组件不可复用
- 无路由
- 无 TypeScript 类型
- 无设计系统约束
- 日志和大 JSON 直接渲染，后续容易卡
- 测试主要靠手工和少量后端测试

## 1.2 当前页面结构

### 左侧边栏

- 品牌区
- 「发布任务」按钮
- 「硬件资源」按钮
- 搜索框：
  - 搜索 `run_id` / 分支 / 平台 / Change-Id
- verdict 筛选：
  - running / success / failed / timeout / pending / suspended
- 排序：
  - 最新优先
  - 最早优先
  - 按结论
- 「只看我的」复选框
- 「刷新任务列表」
- 任务列表
- 列表状态文本

任务卡片显示：

- run_id
- 进度 `done/total`
- 耗时
- key artifact
- verdict 徽章

### 主区域

主区域有三种视图：

1. 任务详情
2. 硬件资源
3. 发布任务

#### 任务详情

顶部：

- run_id
- 创建时间 / 更新时间 / 耗时
- verdict 徽章
- 进度
- 分支
- 平台
- Change-Id
- 刷新详情
- 删除任务

Tab：

- 概览
- 阶段详情
- 产物
- DEBUG

概览包含：

- 任务概况
- 流程配置
  - Prepare
  - Build
  - Upload
  - Publish
  - Trigger
  - Flash
  - Test
- 测试统计
- CI / 链接
- 阶段进度

阶段详情包含：

- 每个阶段的名称、状态、耗时
- 阶段参数
- 日志展开/收起
- build.log 快捷入口
- 产物链接

产物包含：

- 阶段
- 产物名
- 大小
- 下载/打开链接

DEBUG 包含：

- 原始 manifest JSON
- 复制 JSON

#### 硬件资源

顶部：

- SSH host
- 最后刷新时间
- 设备数量
- 刷新设备
- 返回任务

设备卡片：

- SN
- 状态：hdc / adb / fastboot / offline
- busy / idle
- raw_state
- busy_by
- busy_stage
- uncertain 提示

刷新策略：

- 7 秒刷新
- 页面不可见时暂停

#### 发布任务

表单字段：

- 当前身份
- 配置
- Root MR
- 样机 SN
- 测试范围 profile
- 用例
- 备注
- 阶段选择
- 重置 / 发布任务

交互：

- 加载 `/api/configs`
- 选择配置后加载 `/api/configs/{name}`
- SN 支持多个，逗号分隔
- 可从在线设备中选择 SN
- 切换 profile 自动带出默认用例
- 阶段复选框支持 skip
- 跳过 flash 时提示测试将针对已有镜像运行
- 提交到 `/api/tasks`
- 成功后跳转任务详情

## 1.3 当前日志展示方式

当前后端在任务详情里返回：

- `log_tail`：截取的日志尾部
- `log_url`：完整日志流地址
- `log_download`：日志下载地址
- `log_size`
- `log_path`

前端行为：

- 默认显示 `log_tail`
- 点击展开后显示完整日志
- 展开状态记录在 `S.logOpen`
- 滚动位置记录在 `S.logScroll`
- 参数详情展开状态记录在 `S.paramOpen`
- 页面滚动位置记录在 `S.pageScroll`

脱敏后的日志展示示例：

```text
[2026-11-14 10:00:00] [INFO] stage=**** run_id=run-20261114-001
[2026-11-14 10:00:01] [INFO] path=/****/****.log
[2026-11-14 10:00:02] [INFO] sn=SN-****0817
[2026-11-14 10:00:03] [INFO] result=****
```

## 1.4 当前状态颜色

- running：蓝色
- success：绿色
- failed：红色
- timeout：紫色
- pending：琥珀色
- suspended：橙色
- skipped：灰色
- hdc：蓝色
- adb：紫色
- fastboot：橙色
- offline：灰色
- busy：红色
- idle：绿色

## 1.5 当前前端已知问题

- 页面全部写在 `web/page.py`，难以维护
- 无组件层
- 无设计 token 文档
- 无 URL 路由，任务状态主要靠 query 参数
- 日志和 manifest 直接渲染，数据大时可能卡顿
- 没有 TypeScript 类型
- 没有 OpenAPI 自动生成客户端
- 当前 HTML 中 `#tabs` 容器出现了重复定义，重做时应只保留一个
- 没有正式的移动端布局
- 没有统一的前端错误模型

---

# 2. 目标前端架构

## 2.1 推荐技术栈

推荐 Vite + React + TypeScript SPA。

- React
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS
- Radix Primitives 或 shadcn/ui
- React Hook Form + Zod
- Recharts
- Vitest + Testing Library
- Playwright

不建议首版使用 Next.js：

- 这是内部工具，不需要 SSR/SEO
- FastAPI 已经是服务端
- SPA 构建后可直接由 FastAPI 或 nginx 静态托管
- 架构更简单，部署更轻

## 2.2 推荐目录结构

```text
frontend/
  src/
    app/
      router.tsx
      providers.tsx
    pages/
      TasksPage.tsx
      TaskDetailPage.tsx
      NewTaskPage.tsx
      HardwarePage.tsx
    features/
      runs/
        api.ts
        queries.ts
        components/
      run-detail/
        api.ts
        queries.ts
        components/
      devices/
        api.ts
        queries.ts
        components/
      configs/
        api.ts
        queries.ts
      task-submit/
        api.ts
        schema.ts
        components/
    components/
      layout/
      ui/
      feedback/
      charts/
    lib/
      api/
        client.ts
        errors.ts
        types.ts
      format/
      hooks/
    styles/
      tokens.css
      globals.css
    main.tsx
  tests/
    unit/
    e2e/
  vite.config.ts
```

## 2.3 路由

```text
/tasks                 任务列表
/tasks/:runId          任务详情
/submit                发布任务
/hardware              硬件资源
```

任务详情内部 tab：

```text
overview       概览
stages         阶段详情
logs           日志
artifacts      产物
manifest       DEBUG
```

## 2.4 状态管理

- 服务端状态：TanStack Query
- URL 状态：搜索、筛选、排序、当前 run、当前 tab
- 表单状态：React Hook Form
- 少量 UI 状态：Zustand 或局部 state
- 不建议 Redux

查询映射：

```text
/api/runs             任务列表
/api/status           任务详情
/api/devices          设备
/api/configs          配置列表
/api/configs/{name}   配置详情
/api/tasks            提交任务
/api/log              日志
```

轮询：

- 任务列表：15 秒
- 任务详情：running 时 2 秒，结束停止
- 硬件资源：7 秒
- 页面不可见时暂停

## 2.5 部署

推荐同源部署：

```text
/
  /             前端 SPA
  /api/*        FastAPI
  /assets/*     静态资源
  /download     文件下载
```

前端构建产物 `frontend/dist` 由 nginx 或 FastAPI `StaticFiles` 托管。  
同源部署不需要 CORS；独立域名部署时再补充 CORS。

---

# 3. API 公共约定

## 3.1 Base URL

```text
/api
```

当前没有 `/api/v1`。

## 3.2 认证

- 当前没有 token / cookie 登录
- 后端使用来源 IP allowlist
- 用户身份由后端解析
- 前端不要用 `owner` 做鉴权
- `POST /api/tasks` 中的 `owner` 会被忽略

## 3.3 时间

```text
YYYY-MM-DD HH:MM:SS
```

## 3.4 阶段

```text
prepare
build
upload
publish
trigger
flash
test
```

## 3.5 阶段状态

```text
pending
running
success
failed
timeout
skipped
suspended
```

## 3.6 整体 verdict

```text
running
success
failed
timeout
pending
skipped
unknown
```

## 3.7 设备状态

```text
hdc
adb
fastboot
offline
```

---

# 4. API 列表

## 4.1 当前身份

```http
GET /api/me
```

响应：

```json
{
  "uid": "ip:10.0.0.1",
  "label": "10.0.0.1",
  "source": "ip",
  "authenticated": false
}
```

用途：

- 显示当前用户
- “只看我的”默认 owner
- 不用于前端鉴权

---

## 4.2 任务列表

```http
GET /api/runs
```

查询参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `q` | string | 搜索 run_id / 分支 / 平台 / task / Change-Id |
| `verdict` | string | 按结论过滤 |
| `sort` | string | `newest` / `oldest` / `status` |
| `owner` | string | 按 owner 过滤 |
| `mine` | bool | 只看当前身份 |

响应：

```json
{
  "runs": ["run-20261114-001"],
  "items": [
    {
      "run_id": "run-20261114-001",
      "mtime": 1760000000.0,
      "created_at": "2026-11-14 10:00:00",
      "updated_at": "2026-11-14 10:05:00",
      "current_stage": "trigger",
      "stages": [
        {
          "name": "prepare",
          "status": "success",
          "start": "2026-11-14 10:00:00",
          "end": "2026-11-14 10:00:05",
          "duration": 5,
          "error": ""
        }
      ],
      "progress": {"done": 4, "total": 7},
      "verdict": "running",
      "branch": "br-****",
      "platform": "chd",
      "task": "task-****",
      "subtask": "subtask-****",
      "change_id": "I****",
      "cmcdir": "cmc-****",
      "sn": "SN-****0817",
      "key_artifact": "pkg-**** 238M",
      "artifact_count": 1,
      "test_summary": null,
      "duration": 300,
      "dry_run": false,
      "source_config": {},
      "publish": {},
      "owner": "ip:10.0.0.1"
    }
  ]
}
```

列表建议展示：

- run_id
- verdict
- 当前阶段
- 进度
- 分支 / 平台
- 耗时
- owner
- key artifact

---

## 4.3 任务详情

```http
GET /api/status?run={run_id}
```

`run` 可省略，省略时返回最新任务。

响应：

```json
{
  "run_id": "run-20261114-001",
  "manifest": {},
  "run_info": {
    "run_id": "run-20261114-001",
    "verdict": "running",
    "current_stage": "trigger",
    "branch": "br-****",
    "platform": "chd",
    "task": "task-****",
    "subtask": "subtask-****",
    "change_id": "I****",
    "sn": "SN-****0817",
    "owner": "ip:10.0.0.1",
    "progress": {"done": 4, "total": 7},
    "duration": 300,
    "test_summary": null
  },
  "source_config": {},
  "stages": [
    {
      "name": "flash",
      "status": "success",
      "start": "2026-11-14 10:00:00",
      "end": "2026-11-14 10:03:00",
      "duration": 180,
      "error": "",
      "summary": "",
      "params": {},
      "log_tail": "...",
      "log_path": "/****/flash.log",
      "log_size": 1234,
      "log_url": "/api/log?run=run-20261114-001&stage=flash",
      "log_download": "/api/log?download=1&run=run-20261114-001&stage=flash",
      "jenkins": [],
      "remark": "",
      "artifacts": []
    }
  ],
  "current_stage": "trigger",
  "progress": {"done": 4, "total": 7},
  "is_running": true,
  "server_time": "2026-11-14 10:05:00"
}
```

建议：

- `run_info` 用于概览
- `stages` 用于时间线
- `log_tail` 用于折叠日志
- `log_url` 用于展开日志
- `manifest` 仅用于 DEBUG

---

## 4.4 日志

```http
GET /api/log?run={run_id}&stage={stage}
```

参数：

| 参数 | 说明 |
|---|---|
| `run` | 任务 ID |
| `stage` | 阶段名 |
| `download` | `1` 下载附件 |

响应：

```text
text/plain
```

错误：

```json
{
  "detail": "log not found"
}
```

脱敏日志示例：

```text
[2026-11-14 10:00:00] [INFO] stage=**** run_id=run-20261114-001
[2026-11-14 10:00:01] [INFO] path=/****/****.log
[2026-11-14 10:00:02] [INFO] sn=SN-****0817
```

---

## 4.5 配置列表

```http
GET /api/configs
```

响应：

```json
{
  "configs": [
    {
      "name": "cfg-****.json",
      "label": "cfg-****",
      "test_profile": "profile-****",
      "task": "task-****",
      "branch": "br-****",
      "product": "product-****",
      "docker_build": true,
      "source_config_enabled": true
    }
  ]
}
```

---

## 4.6 配置详情

```http
GET /api/configs/{name}
```

响应：

```json
{
  "name": "cfg-****.json",
  "editable": {
    "root_mr": "",
    "mr_links": [],
    "sn": ["SN-****0817"],
    "test_profile": "profile-****",
    "functions": ["TestSuite/****"],
    "remark": ""
  },
  "stages": [
    "prepare",
    "build",
    "upload",
    "publish",
    "trigger",
    "flash",
    "test"
  ],
  "readonly": {
    "task": "task-****",
    "branch": "br-****",
    "product": "product-****",
    "build_group": "1",
    "docker_build": true,
    "bypass_build": false,
    "skip_flash": false,
    "device_enabled": true,
    "source_config_enabled": true,
    "cmcdir": "cmc-****"
  },
  "test_profiles": ["profile-****"],
  "profile_details": {
    "profile-****": {
      "functions": ["TestSuite/****"],
      "platform": "chd",
      "sn": ""
    }
  }
}
```

---

## 4.7 提交任务

```http
POST /api/tasks
```

请求：

```json
{
  "config": "cfg-****.json",
  "overrides": {
    "root_mr": "****",
    "mr_links": [],
    "sn": ["SN-****0817"],
    "test_profile": "profile-****",
    "functions": ["TestSuite/****"],
    "remark": "web submit"
  },
  "stages": {
    "from_stage": "prepare",
    "only_stage": "",
    "skip": ["flash"]
  }
}
```

成功：

```json
{
  "ok": true,
  "run_id": "run-20261114-001",
  "pid": 12345
}
```

失败：

```json
{
  "ok": false,
  "error": "too many active tasks for ip:10.0.0.1 (limit 2)"
}
```

说明：

- `owner` 会被后端忽略
- `overrides` 只覆盖非空值
- `stages.skip` 为跳过阶段
- `stages.only_stage` 为空表示从 `from_stage` 开始

---

## 4.8 设备列表

```http
GET /api/devices
```

响应：

```json
{
  "ssh_host": "WIN-HOST-1",
  "server_time": "2026-11-14 10:05:00",
  "devices": [
    {
      "sn": "SN-****0817",
      "state": "hdc",
      "raw_state": "hdc",
      "busy": false,
      "busy_by": "",
      "busy_stage": "",
      "uncertain": false
    }
  ],
  "error": ""
}
```

说明：

- `state`：hdc / adb / fastboot / offline
- `busy`：是否被 flash/test 占用
- `busy_by`：占用任务 run_id
- `busy_stage`：flash / test / unknown
- `uncertain`：锁或任务状态无法确认
- 探测失败仍返回 200，错误放在 `error`，前端必须显示

---

## 4.9 删除任务

```http
POST /api/delete
```

请求：

```json
{
  "run": "run-20261114-001"
}
```

成功：

```json
{
  "ok": true,
  "deleted": "run-20261114-001"
}
```

错误：

- `400`：run id 非法
- `403`：不是提交者
- `409`：任务还在运行
- `500`：删除失败

---

## 4.10 在 Windows 上打开文件/目录

```http
GET /api/open?path={windows_path}&open=1
```

示例：

```http
GET /api/open?path=D:\TEE-TEST\one-entry&open=1
```

响应：

```json
{
  "ok": true,
  "path": "D:\\TEE-TEST\\one-entry",
  "error": ""
}
```

说明：

- 有副作用，只在用户点击时调用
- 路径必须是 Windows 路径

---

## 4.11 文件下载

```http
GET /download?path={allowed_path}
```

返回文件流。仅允许服务端白名单目录。

---

## 4.12 静态资源

```http
GET /
GET /favicon.ico
GET /assets/{name}
```

---

# 5. 目标页面设计

## 5.1 `/tasks` 任务中心

布局：

- 左侧任务列表
- 顶部筛选栏
- 右侧任务摘要

筛选：

- 搜索
- verdict
- 排序
- 只看我的
- 刷新

任务卡片：

- run_id
- verdict
- 当前阶段
- 进度
- 分支 / 平台
- 耗时
- key artifact

## 5.2 `/tasks/:runId` 任务详情

Tab：

1. 概览
2. 阶段详情
3. 日志
4. 产物
5. DEBUG

概览：

- verdict
- 进度
- 当前阶段
- 分支 / 平台
- Change-Id
- 测试统计
- SN
- 结果目录
- owner

阶段详情：

- 7 个阶段时间线
- 状态徽章
- 耗时
- 错误
- 阶段参数折叠
- 日志展开
- 产物

日志：

- 阶段选择
- `log_tail` 首屏
- 展开后请求完整日志
- 自动滚动
- 复制 / 下载

产物：

- 名称
- 大小
- 所属阶段
- 下载 / 打开

DEBUG：

- manifest JSON
- 复制

## 5.3 `/submit` 发布任务

字段：

- 身份
- 配置
- Root MR
- SN
- test profile
- functions
- remark
- 阶段选择

交互：

1. `/api/configs`
2. `/api/configs/{name}`
3. 填表
4. `/api/tasks`
5. 跳转 `/tasks/:runId`

## 5.4 `/hardware` 硬件资源

- SSH host
- 最后刷新时间
- 设备卡片
- 状态徽章
- busy / idle
- busy_by
- busy_stage
- uncertain
- 探测错误
- 7 秒刷新，隐藏暂停

---

# 6. 设计系统建议

实现前建议创建 `DESIGN.md`，至少包含：

- 颜色 token
- 字体
- 字号
- 间距
- 圆角
- 阴影
- 阶段状态颜色
- 设备状态颜色
- 亮色/暗色主题
- 表格/卡片/徽章/时间线/日志面板
- 响应式断点
- 无障碍规则

颜色：

```text
running    蓝色
success    绿色
failed     红色
timeout    紫色
pending    琥珀色
suspended  橙色
skipped    灰色
hdc        蓝色
adb        紫色
fastboot   橙色
offline    灰色
busy       红色
idle       绿色
```

---

# 7. 后端建议

可选增强：

1. 开启 OpenAPI
   当前 `docs_url=None`、`redoc_url=None`，开发环境可开启 `/openapi.json`，用 `openapi-typescript` 生成类型。

2. 统一错误格式
   目前有 `{ok:false,error}` 和 `{detail}`，建议统一为：

```json
{
  "ok": false,
  "error": "message",
  "code": "OPTIONAL_CODE"
}
```

3. 增加语义化别名

```http
GET /api/runs/{run_id}
```

4. 增加健康检查

```http
GET /api/health
```

5. 独立部署时增加 CORS

6. 后续可增加 SSE

```http
GET /api/runs/{run_id}/events
```

用于状态和日志推送，初期可不做。

---

# 8. 给 ChatGPT 的生成约束

请生成 React + TypeScript + Vite 前端，遵守：

- 使用文档中的真实接口路径和字段
- 不要发明后端不存在的接口
- 使用 TanStack Query 管理接口
- 使用 TanStack Router
- 使用 Tailwind CSS
- 使用 Radix/shadcn 风格组件
- 任务详情 running 时 2 秒轮询，结束停止
- 设备页 7 秒轮询，页面不可见暂停
- 日志默认只显示 `log_tail`
- 展开日志再请求 `/api/log`
- 错误必须显示，不要静默失败
- 设备探测错误必须显示 `error`
- 提交任务不依赖前端 `owner`
- 所有示例数据使用脱敏值
- 先实现任务中心、任务详情、发布任务、硬件资源四个页面
- 保留登录和权限扩展点
- 不要用 mock 掩盖失败，mocked 数据必须显式标注

---

# 9. 验收标准

- `/tasks` 可搜索、筛选、排序、只看我的
- `/tasks/:runId` 展示 7 个阶段、状态、耗时、错误、日志、产物
- 日志支持折叠、展开、复制、下载
- `/submit` 能提交并跳转详情
- `/hardware` 展示设备状态和 busy 信息
- 所有接口错误可见
- 刷新页面保留当前任务和筛选
- 375 / 768 / 1280 宽度可用
- 不引入后端不存在的字段或接口
