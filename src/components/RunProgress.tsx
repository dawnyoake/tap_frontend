import { statusLabels } from "./StatusBadge";
import {
  stages,
  stageLabels,
  duration,
  type Run,
  type Detail,
  type Status,
} from "../lib/api";
import { getStageStatus, isStageFault, type StageName } from "../lib/runStages";
import { Check, LoaderCircle, TimerOff, X } from "lucide-react";

export function Progress({ run }: { run: Run }) {
  const segments = stages.map((name, index) => {
    const status = getStageStatus(run, name, index);
    return { name, status, label: `${stageLabels[name]}：${statusLabels[status]}` };
  });

  return (
    <div className="progress-cell">
      <div className="progress-segments" role="img" aria-label={segments.map(({ label }) => label).join("，")}>
        {segments.map(({ name, status, label }) => (
          <span key={name} className={`progress-segment ${status}`} title={label} />
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
  fault,
  selected,
  onStageSelect,
}: {
  detail: Detail;
  fault?: { name: StageName; status: Status };
  selected?: StageName;
  onStageSelect: (name: StageName) => void;
}) {
  return (
    <div className="pipeline diagnostic-pipeline" role="group" aria-label="流水线阶段">
      {stages.map((name, i) => {
        const s = detail.stages.find((s) => s.name === name);
        const status = fault?.name === name ? fault.status : s?.status || "pending";
        const caption = isStageFault(status) || !s?.duration
          ? statusLabels[status]
          : duration(s.duration);
        return (
          <button
            type="button"
            className={`pipeline-step ${status}`}
            key={name}
            aria-current={selected === name ? "step" : undefined}
            aria-label={`${stageLabels[name]} · ${statusLabels[status]}`}
            onClick={() => onStageSelect(name)}
          >
            <span className="step-node" aria-hidden="true">
              {status === "success" ? (
                <Check size={14} />
              ) : status === "running" ? (
                <LoaderCircle size={14} className="spin" />
              ) : status === "failed" ? (
                <X size={14} />
              ) : status === "timeout" ? (
                <TimerOff size={14} />
              ) : (
                i + 1
              )}
            </span>
            <strong>{stageLabels[name]}</strong>
            <span className="step-time">{caption}</span>
          </button>
        );
      })}
    </div>
  );
}
