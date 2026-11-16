import { ArrowDownToLine, ExternalLink } from "lucide-react";
import { isDemo, type Artifact } from "../lib/api";
import { artifactAction } from "../lib/artifacts";

export function ArtifactAction({ artifact }: { artifact: Artifact }) {
  const action = artifactAction(artifact);
  if (!action) return <small className="subtle">{isDemo ? "演示占位" : "暂无链接"}</small>;

  const opensPage = action.kind === "open";
  const Icon = opensPage ? ExternalLink : ArrowDownToLine;
  const label = opensPage ? "打开链接" : "下载";
  return (
    <a
      className="button"
      href={action.href}
      download={opensPage ? undefined : true}
      target={opensPage ? "_blank" : undefined}
      rel={opensPage ? "noopener noreferrer" : undefined}
      aria-label={`${label} ${artifact.name}`}
    >
      <Icon size={14} aria-hidden="true" /> {label}
    </a>
  );
}
