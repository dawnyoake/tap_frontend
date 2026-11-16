import {
  Activity,
  Check,
  CircleAlert,
  CirclePause,
  CircleX,
  LockKeyhole,
  SkipForward,
  TimerOff,
  WifiOff,
  Clock,
} from "lucide-react";

export const statusLabels: Record<string, string> = {
  running: "运行中",
  success: "已成功",
  failed: "已失败",
  timeout: "已超时",
  pending: "等待中",
  suspended: "已暂停",
  skipped: "已跳过",
  unknown: "未知",
  busy: "占用中",
  idle: "空闲可用",
  offline: "离线",
  uncertain: "锁状态不明",
  "demo-submit": "演示发布",
};
const statusIcons: Record<string, typeof Activity> = {
  running: Activity,
  success: Check,
  failed: CircleX,
  timeout: TimerOff,
  pending: Clock,
  suspended: CirclePause,
  skipped: SkipForward,
  busy: LockKeyhole,
  idle: Check,
  offline: WifiOff,
  uncertain: CircleAlert,
};

export function Badge({ status }: { status: string }) {
  const Icon = statusIcons[status];
  return (
    <span className={`badge ${status}`}>
      {Icon ? <Icon size={12} aria-hidden="true" /> : <i />}
      {statusLabels[status] || status.toUpperCase()}
    </span>
  );
}
