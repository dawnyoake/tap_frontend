import { stages, type Run, type Stage, type Status } from "./contracts";

export type StageName = (typeof stages)[number];

export function getStageStatus(run: Run, name: StageName, index: number): Status {
  const reported = run.stages?.find((stage) => stage.name === name);
  if (reported) return reported.status;
  if (name === run.current_stage && run.verdict !== "success") return run.verdict;
  return index < run.progress.done ? "success" : "pending";
}

export function isStageFault(status: Status | undefined): status is "failed" | "timeout" {
  return status === "failed" || status === "timeout";
}

export function findFaultStage(run: Run, availableStages: Stage[] = run.stages ?? []) {
  const faults = availableStages.filter((stage) => isStageFault(stage.status));
  const candidates = [
    faults.find((stage) => stage.name === run.current_stage)?.name,
    ...faults.map((stage) => stage.name),
    isStageFault(run.verdict) ? run.current_stage : undefined,
  ];
  return candidates
    .map((name) => stages.find((stage) => stage === name))
    .find((stage) => stage !== undefined);
}
