import { YouTubeFetchError } from "@/core/errors";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
};

export async function fetchText(url: string, fetcher: typeof fetch = fetch): Promise<string> {
  const response = await fetcher(url, { headers: BROWSER_HEADERS });
  if (!response.ok) throw new YouTubeFetchError(`YouTube respondió ${response.status} para ${url}`);
  return response.text();
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Extracts the JSON object assigned right after `marker` in an HTML/JS payload, matching braces so it survives nested objects and strings. */
export function extractJsonAfterMarker(source: string, marker: string): unknown {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) return undefined;
  let start = markerIndex + marker.length;
  while (start < source.length && /\s/.test(source[start])) start++;
  if (source[start] !== "{") return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) return undefined;
  try {
    return JSON.parse(source.slice(start, end));
  } catch {
    return undefined;
  }
}
