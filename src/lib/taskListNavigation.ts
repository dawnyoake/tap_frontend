interface TaskListOrigin {
  search: { q: string; verdict: string; sort: string; mine: boolean };
  scrollTop: number;
  runId: string;
}

declare module "@tanstack/history" {
  interface HistoryState {
    taskListOrigin?: TaskListOrigin;
    taskListReturn?: Pick<TaskListOrigin, "scrollTop" | "runId">;
  }
}

export function taskListReturnOptions(origin: TaskListOrigin | undefined) {
  return origin
    ? {
        search: origin.search,
        state: { taskListReturn: { scrollTop: origin.scrollTop, runId: origin.runId } },
      }
    : {};
}
