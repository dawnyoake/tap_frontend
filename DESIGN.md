# TEE Pipeline 设计规范

以任务操作为中心的浅色、极简扁平工作台。固定导航 → 任务列表 → 任务摘要；避免把所有技术参数同时堆在首屏。

- 主色 `#4168e8`，页面底色 `#f7f8fa`，面板 `#ffffff`，分隔线 `#e9ecf1`，正文 `#273247`，次要文本 `#8a93a3`。
- running / hdc 蓝；success / idle 绿；failed 红；timeout / adb 紫；pending 琥珀；suspended / fastboot 橙；skipped / offline 灰。状态同时用文本表达。
- 中文使用本地托管的 HarmonyOS Sans SC（Regular / Medium / Bold），西文、数字和日志使用 JetBrains Mono。以终末地的中文黑体气质为参考，不声称是经官方认证的游戏原版字体。标题 27–32px，正文 14–15px，辅助信息 11–13px；窄屏任务 ID 保留 10px 以完整展示。
- 间距以 4px 为基础，面板内边距 24–30px；圆角 5–7px。主要面板无投影，模态框使用轻阴影。任务行高 94px；移除看板统计，使用标题、列表和摘要构成留白层次。
- 主要动作采用实心蓝色，次要动作白底描边。危险操作使用红色，并二次确认。
- 默认展示“我的任务”，显式切换“全部任务”；搜索和状态筛选位于列表顶部。整行链接直接进入详情，悬停或键盘聚焦更新右侧摘要；摘要只显示当前阶段、进度与耗时，完整七阶段流程保留在详情。详细参数按需展开，日志默认仅显示尾部。
- 响应式断点：1250 / 1000 / 800 / 560px。窄屏缩成图标导航，任务表格保留关键字段；详情及表单单列。
- 所有输入均有标签，图标按钮有 aria-label；支持键盘焦点，错误使用 role=alert，尊重减少动画偏好。
- 首版仅实现浅色主题。深色主题应基于完整 token 扩展，避免直接反色影响状态识别。

## 字体资源

所有字体均随项目本地托管，不依赖外部 CDN。原始中文 TTF 未做修改或子集化，字体许可保存在 `public/fonts/`，页面底部注明使用 HarmonyOS Sans。

- HarmonyOS Sans：华为官方 https://developer.huawei.com/images/download/general/HarmonyOS-Sans.zip
- JetBrains Mono：https://github.com/JetBrains/JetBrainsMono （OFL-1.1）
- 字体样式入口：`src/styles/fonts.css`。JetBrains 在字体栈首位覆盖西文，中文回退到 HarmonyOS Sans SC。
