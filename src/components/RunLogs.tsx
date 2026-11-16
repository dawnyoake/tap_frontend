import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorBox } from "./Feedback";
import {
  api,
  isDemo,
  logUrl,
  stageLabels,
  type Stage,
} from "../lib/api";
import { httpHref } from "../lib/artifacts";
import { demoApi } from "../lib/demoApi";
import { LOG_PREVIEW_BYTES } from "../lib/logPreview";
import { ArrowDownToLine, Copy, Terminal } from "lucide-react";

async function copy(text: string, set: (s: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    set("已复制");
  } catch {
    set("复制失败，请手动选择文本");
  }
  setTimeout(() => set(""), 2500);
}
export function JsonPanel({ value }: { value: unknown }) {
  const [msg, set] = useState("");
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>原始 Manifest</h2>
        <button
          className="button"
          onClick={() => copy(JSON.stringify(value, null, 2), set)}
        >
          <Copy size={14} aria-hidden="true" />
          {msg || "复制 JSON"}
        </button>
      </div>
      <pre className="json-panel">{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}
function colorLogPreview(text: string) {
  const lines = text.split(/(?<=\n)/);
  if (lines.length > 500) return text;
  return lines.map((line, index) => {
    const severity = line.match(/\[(ERROR|FATAL|WARN|WARNING)\]/)?.[1];
    if (!severity) return line;
    const kind = severity === "ERROR" || severity === "FATAL" ? "error" : "warning";
    return <span className={`diagnostic-log-${kind}`} key={index}>{line}</span>;
  });
}

export function StageLog({
  runId,
  name,
  stage,
}: {
  runId: string;
  name: string;
  stage?: Stage;
}) {
  const [online, setOnline] = useState(false);
  const [auto, setAuto] = useState(stage?.status === "running");
  const ref = useRef<HTMLPreElement>(null);
  const client = useQueryClient();
  const queryKey = ["log-preview", runId, name, stage?.log_url] as const;
  const log = useQuery({
    queryKey,
    queryFn: ({ signal }) => api.logPreview(runId, name, { url: stage?.log_url, signal }),
    enabled: online,
  });
  const download = useMutation({
    mutationFn: async () => {
      const content = await demoApi.log(runId, name);
      if (!content) throw new Error("暂无日志可下载");
      const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${runId}-${name}.log`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
  const text = online ? log.data?.text ?? "" : stage?.log_tail?.slice(-LOG_PREVIEW_BYTES) ?? "";
  const renderedLog = useMemo(() => colorLogPreview(text), [text]);
  const hasLog = Boolean(
    stage?.log_tail || stage?.log_url || stage?.log_download || stage?.log_path ||
    (typeof stage?.log_size === "number" && stage.log_size > 0),
  );
  useEffect(() => {
    if (auto && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, auto]);

  if (!hasLog) {
    return (
      <div className="diagnostic-stage-card diagnostic-log">
        <header className="diagnostic-stage-card-header"><h3>阶段日志</h3></header>
        <p className="diagnostic-empty">暂无阶段日志</p>
      </div>
    );
  }

  const downloadHref = httpHref(stage?.log_download) || logUrl(runId, name, true);
  return (
    <div className="diagnostic-stage-card diagnostic-log">
      <header className="diagnostic-stage-card-header diagnostic-log-toolbar">
        <div className="diagnostic-log-view">
          <h3>阶段日志</h3>
          <span className="diagnostic-log-name">
            <Terminal size={15} aria-hidden="true" />
            <code>{name}.log</code>
          </span>
          <div className="diagnostic-log-mode" role="group" aria-label="日志阅读模式">
            <button type="button" aria-pressed={!online} onClick={() => {
              setOnline(false);
              void client.cancelQueries({ queryKey, exact: true });
            }}>
              尾部预览
            </button>
            <button type="button" aria-pressed={online} onClick={() => {
              if (online) return;
              setOnline(true);
              setAuto(false);
            }}>
              在线日志
            </button>
          </div>
        </div>
        {isDemo ? (
          <button type="button" className="button diagnostic-log-download" disabled={download.isPending} onClick={() => download.mutate()}>
            <ArrowDownToLine size={15} aria-hidden="true" />
            {download.isPending ? "正在准备…" : "下载完整日志"}
          </button>
        ) : (
          <a className="button diagnostic-log-download" href={downloadHref} download>
            <ArrowDownToLine size={15} aria-hidden="true" />
            下载完整日志
          </a>
        )}
      </header>
      <ErrorBox error={(online && log.error) || download.error} />
      <pre ref={ref} className="terminal diagnostic-terminal" tabIndex={0} aria-label={`${stageLabels[name] || name}日志`}>
        {text
          ? renderedLog
          : online && log.isFetching ? "正在加载…" : "暂无日志预览"}
      </pre>
      <div className="diagnostic-log-footer">
        <label className="checkbox">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          自动滚动
        </label>
        <span role="status">
          {online && (log.isFetching
            ? "正在加载在线日志…"
            : log.data?.truncated && "最多显示开头 64 KiB，完整内容请下载。")}
        </span>
      </div>
    </div>
  );
}
