import { Folder, LoaderCircle } from "lucide-react";

export function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <div className="error" role="alert">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ) : null;
}
export function Empty({ text = "暂无匹配的任务" }: { text?: string }) {
  return (
    <div className="empty">
      <Folder size={30} />
      <p>{text}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="empty">
      <LoaderCircle className="spin" />
      正在加载…
    </div>
  );
}
