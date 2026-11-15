import type { Ref } from "react";
import { ArrowDownToLine, ChevronDown, FileText } from "lucide-react";
import { duration, isDemo, stageLabels, type Stage, type Status } from "../lib/api";
import { artifactDownloadHref } from "../lib/artifacts";
import { isStageFault, type StageName } from "../lib/runStages";
import { StageLog } from "./RunLogs";
import { Badge } from "./StatusBadge";

const paramLabels: Record<string, string> = {
  config: "流水线配置",
  branch: "代码分支",
  product: "目标产品",
  platform: "目标平台",
  root_mr: "Root MR",
  root_code_path: "Root 代码路径",
  docker_build: "Docker 构建",
  sn: "目标设备",
  test_profile: "测试 Profile",
  functions: "测试用例",
  timeout_s: "超时上限（秒）",
};

function ParameterValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span>—</span>;
  if (typeof value === "boolean") return <span>{value ? "是" : "否"}</span>;
  if (Array.isArray(value) && value.every((item) => item === null || typeof item !== "object")) {
    return value.length ? (
      <ul className="stage-parameter-list">
        {value.map((item, index) => <li key={index}><ParameterValue value={item} /></li>)}
      </ul>
    ) : <span>—</span>;
  }
  if (typeof value === "object") {
    return <pre>{JSON.stringify(value, null, 2)}</pre>;
  }
  return <code>{String(value)}</code>;
}

function StageParameters({ params }: { params: unknown }) {
  if (params === null || params === undefined || params === "") {
    return <p className="diagnostic-empty">暂无阶段参数</p>;
  }
  if (typeof params !== "object" || Array.isArray(params)) return <ParameterValue value={params} />;
  const entries = Object.entries(params);
  return entries.length ? (
    <dl className="stage-parameters">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt title={key}>{Object.hasOwn(paramLabels, key) ? paramLabels[key] : key}</dt>
          <dd><ParameterValue value={value} /></dd>
        </div>
      ))}
    </dl>
  ) : <p className="diagnostic-empty">暂无阶段参数</p>;
}

export function StageDetails({
  name,
  runId,
  stage,
  status,
  selected,
  targetRef,
}: {
  name: StageName;
  runId: string;
  stage?: Stage;
  status: Status;
  selected: boolean;
  targetRef?: Ref<HTMLElement>;
}) {
  const artifacts = stage?.artifacts ?? [];
  const titleId = `detail-stage-${name}`;
  return (
    <section
      className={`panel stage-panel diagnostic-stage ${status}${selected ? " stage-target" : ""}`}
      ref={targetRef}
      tabIndex={targetRef ? -1 : undefined}
      aria-labelledby={titleId}
    >
      <details open={selected || undefined}>
        <summary className="diagnostic-stage-summary">
          <span className="diagnostic-stage-title">
            <ChevronDown size={15} aria-hidden="true" />
            <strong id={titleId}>{stageLabels[name]}</strong>
            <code>{name}</code>
          </span>
          <span className="diagnostic-stage-meta">
            {artifacts.length > 0 && <span>{artifacts.length} 项产物</span>}
            {typeof stage?.duration === "number" && <span className="mono">{duration(stage.duration)}</span>}
            <Badge status={status} />
          </span>
        </summary>
        <div className="diagnostic-stage-body">
          {(stage?.error || stage?.summary || stage?.start || stage?.end) && (
            <div className="diagnostic-stage-context">
              {stage?.error && <p className="diagnostic-stage-error">{stage.error}</p>}
              {stage?.summary && stage.summary !== stage.error && <p>{stage.summary}</p>}
              {(stage?.start || stage?.end) && (
                <div className="diagnostic-stage-timing">
                  {stage.start && <span>开始 <time>{stage.start}</time></span>}
                  {stage.end && <span>结束 <time>{stage.end}</time></span>}
                </div>
              )}
            </div>
          )}
          <div className="diagnostic-stage-content">
            <div className="diagnostic-stage-log">
              <h3>阶段日志</h3>
              <StageLog runId={runId} name={name} stage={stage} />
            </div>
            <div className="diagnostic-stage-data">
              <div>
                <h3>阶段参数</h3>
                <StageParameters params={stage?.params} />
              </div>
              <div>
                <h3>阶段产物</h3>
                {artifacts.length > 0 ? (
                  <ul className="diagnostic-files">
                    {artifacts.map((artifact, index) => {
                      const href = artifactDownloadHref(artifact);
                      return (
                        <li key={index}>
                          <FileText size={15} aria-hidden="true" />
                          <div>
                            <strong>{artifact.name}</strong>
                            {artifact.size != null && <small>{artifact.size}</small>}
                          </div>
                          {href ? (
                            <a className="button" href={href} download aria-label={`下载 ${artifact.name}`}>
                              <ArrowDownToLine size={14} aria-hidden="true" /> 下载
                            </a>
                          ) : <small>{isDemo ? "演示占位" : "暂无下载链接"}</small>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="diagnostic-empty">{isStageFault(status) ? "该阶段暂无可下载产物" : "暂无阶段产物"}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
