import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorBox } from "./Feedback";
import {
  api,
  isDemo,
  logUrl,
  stages,
  stageLabels,
  type Detail,
} from "../lib/api";
import { ArrowDown, ArrowDownToLine, Copy, Terminal } from "lucide-react";

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
          <Copy size={14} />
          {msg || "复制 JSON"}
        </button>
      </div>
      <pre className="json-panel">{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}
export function Logs({ detail }: { detail: Detail }) {
  const [stage, setStage] = useState(
    detail.run_info.current_stage || "prepare",
  );
  const [expanded, setExpanded] = useState(false);
  const [auto, setAuto] = useState(true);
  const [msg, set] = useState("");
  const ref = useRef<HTMLPreElement>(null);
  const log = useQuery({
    queryKey: ["log", detail.run_id, stage],
    queryFn: () => api.log(detail.run_id, stage),
    enabled: expanded,
  });
  const text = expanded
    ? (log.data ?? (log.isError ? "日志加载失败" : "加载中…"))
    : detail.stages.find((s) => s.name === stage)?.log_tail || "暂无日志";
  const displayedText = text || "暂无日志";
  useEffect(() => {
    if (auto && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, auto]);
  return (
    <section className="panel log-panel">
      <div className="panel-title">
        <h2>
          <Terminal size={17} />
          运行日志
        </h2>
        <div className="log-actions">
          <select
            aria-label="日志阶段"
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              setExpanded(false);
            }}
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {stageLabels[s]}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="复制日志"
            disabled={expanded && (log.isPending || log.isError)}
            onClick={() => copy(text, set)}
          >
            <Copy size={16} />
          </button>
          {!isDemo && (
            <a
              className="icon-button"
              aria-label="下载日志"
              href={logUrl(detail.run_id, stage, true)}
            >
              <ArrowDownToLine size={17} />
            </a>
          )}
        </div>
      </div>
      <ErrorBox error={log.error} />
      <div className="log-meta">
        <span className="mono">
          {stage}.log <span> / {expanded ? "完整日志" : "尾部预览"}</span>
        </span>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
          />
          自动滚动
        </label>
      </div>
      <pre ref={ref} className="terminal main-terminal">
        {displayedText}
      </pre>
      <div className="table-footer">
        <span role="status">{msg}</span>
        <button className="text-button" onClick={() => setExpanded(!expanded)}>
          {expanded ? "收起完整日志" : "加载完整日志"}
          <ArrowDown size={14} />
        </button>
      </div>
    </section>
  );
}
