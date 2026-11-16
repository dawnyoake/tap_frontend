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

export function artifactAction(artifact: Artifact): { href: string; kind: "download" | "open" } | undefined {
  const path = typeof artifact.path === "string" ? artifact.path.trim() : "";
  const pathUrl = /^https?:\/\//i.test(path) ? httpHref(path) : undefined;
  const url = httpHref(artifact.url) ?? pathUrl;
  const download = httpHref(artifact.download);
  const href = url ?? download;
  if (href) {
    const { pathname, hash } = new URL(href);
    const isReview = /\/(?:merge[-_]requests|pulls?|pull-requests|changes)\/[^/]+/i.test(pathname)
      || /\/c\/(?:.+\/\+\/)?\d+(?:\/|$)/i.test(pathname)
      || /^#\/c\/\d+(?:\/|$)/i.test(hash);
    if (isReview) {
      return { href, kind: "open" };
    }
  }
  if (download) return { href: download, kind: "download" };
  if (path && !pathUrl) {
    return {
      href: url ?? "/download?" + new URLSearchParams({ path }),
      kind: "download",
    };
  }
  if (!url) return;
  const { pathname, searchParams } = new URL(url);
  const isFile = /(?:^|\/)download(?:\/|$)/i.test(pathname)
    || searchParams.get("download") === "1"
    || /\.(?:zip|gz|tgz|tar|xz|bz2|7z|rar|bin|img|apk|exe|elf|log|txt|csv|json|xml|pdf)$/i.test(pathname);
  return { href: url, kind: isFile ? "download" : "open" };
}
