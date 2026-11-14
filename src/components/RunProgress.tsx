import { statusLabels } from "./StatusBadge";
import {
  stages,
  stageLabels,
  duration,
  type Run,
  type Detail,
} from "../lib/api";
import { Check, LoaderCircle, X } from "lucide-react";

export function Progress({ run }: { run: Run }) {
  return (
    <div className="progress-cell">
      <div className={`progress-segments ${run.verdict}`}>
        {stages.map((s, i) => (
          <i
            key={s}
            className={
              i < run.progress.done
                ? "done"
                : s === run.current_stage
                  ? "current"
                  : ""
            }
          />
        ))}
      </div>
      <span>
        {run.progress.done}
        <em> / {run.progress.total}</em>
      </span>
    </div>
  );
}
export function Pipeline({
  detail,
  compact = false,
}: {
  detail: Detail;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "pipeline vertical" : "pipeline"}>
      {stages.map((name, i) => {
        const s = detail.stages.find((s) => s.name === name);
        return (
          <div className={`pipeline-step ${s?.status || "pending"}`} key={name}>
            <span className="step-node">
              {s?.status === "success" ? (
                <Check size={14} />
              ) : s?.status === "running" ? (
                <LoaderCircle size={14} className="spin" />
              ) : s?.status === "failed" ? (
                <X size={14} />
              ) : (
                i + 1
              )}
            </span>
            <div>
              <strong>{stageLabels[name]}</strong>
              <small>{name.charAt(0).toUpperCase() + name.slice(1)}</small>
            </div>
            <span className="step-time">
              {s?.duration
                ? duration(s.duration)
                : statusLabels[s?.status || "pending"]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
