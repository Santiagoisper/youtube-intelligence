import type { TranscriptSegment } from "@/schemas/pipeline";

export function normalizeTranscript(segments: TranscriptSegment[], rawText = segments.map((s) => s.text).join(" ")): { text: string; segments: TranscriptSegment[] } {
  const clean = (value: string) => value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const normalized: TranscriptSegment[] = [];
  for (const segment of segments) {
    const text = clean(segment.text);
    const previous = normalized.at(-1);
    if (!text || previous?.text.toLowerCase() === text.toLowerCase()) continue;
    normalized.push({ ...segment, text });
  }
  const text = normalized.map((segment) => segment.text).join(" ");
  return { text: text || clean(rawText), segments: normalized };
}