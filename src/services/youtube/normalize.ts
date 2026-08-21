import { YouTubeFetchError } from "@/core/errors";

export function extractChannelReference(input: string): string {
  const value = input.trim();
  if (!value) throw new YouTubeFetchError("Channel URL, handle or ID is required");
  if (value.startsWith("@")) return value;
  try {
    const url = new URL(value);
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) throw new Error("host");
    const handle = url.pathname.match(/^\/(@[^/]+)/)?.[1];
    if (handle) return handle;
    const id = url.pathname.match(/^\/channel\/([^/]+)/)?.[1];
    if (id) return id;
  } catch { /* fall through to ID */ }
  return value;
}

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

/** Returns the 11-char video ID when `input` points at a single video, or null when it looks like a channel reference. */
export function extractVideoReference(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return VIDEO_ID_PATTERN.test(id) ? id : null;
    }
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && VIDEO_ID_PATTERN.test(id) ? id : null;
      }
      const shorts = url.pathname.match(/^\/shorts\/([\w-]{11})/);
      if (shorts) return shorts[1];
      const embed = url.pathname.match(/^\/embed\/([\w-]{11})/);
      if (embed) return embed[1];
    }
    return null;
  } catch {
    return VIDEO_ID_PATTERN.test(value) ? value : null;
  }
}