import type { Artifact } from "./contracts";

export function httpHref(link: unknown) {
  if (typeof link !== "string" || !link.trim()) return;
  try {
    const url = new URL(link, window.location.href);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    return;
  }
}

export function artifactDownloadHref(artifact: Artifact) {
  const href = httpHref(artifact.download) ?? httpHref(artifact.url);
  if (href) return href;
  if (typeof artifact.path === "string" && artifact.path.trim()) {
    return "/download?" + new URLSearchParams({ path: artifact.path });
  }
}
