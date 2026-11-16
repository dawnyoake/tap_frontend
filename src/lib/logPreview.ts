export const LOG_PREVIEW_BYTES = 64 * 1024;

export interface LogPreview {
  text: string;
  truncated: boolean;
}

export async function readLogPreview(response: Response): Promise<LogPreview> {
  const reader = response.body?.getReader();
  if (!reader) return { text: "", truncated: false };

  const range = /^bytes \d+-(\d+)\/(\d+|\*)$/i.exec(response.headers.get("Content-Range") ?? "");
  const hasMoreRanges = Boolean(range && Number(range[1]) + 1 !== Number(range[2]));
  const decoder = new TextDecoder();
  let remaining = LOG_PREVIEW_BYTES;
  let text = "";
  let finished = false;
  try {
    while (remaining >= 0) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        return { text: hasMoreRanges ? text : text + decoder.decode(), truncated: hasMoreRanges };
      }
      text += decoder.decode(value.subarray(0, remaining), { stream: true });
      remaining -= value.byteLength;
      if (remaining === 0 && hasMoreRanges) break;
    }

    // A server may ignore Range. Stop consuming its response at the preview limit.
    return { text, truncated: true };
  } finally {
    if (!finished) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
