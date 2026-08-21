import type { TranscriptSegment } from "@/schemas/pipeline";
export type TranscriptResult =
  | { status: "AVAILABLE"; source: string; language: string; rawText: string; segments: TranscriptSegment[] }
  | { status: "UNAVAILABLE"; reason: string }
  | { status: "FAILED"; reason: string };
export interface TranscriptProvider {
  getTranscript(input: { youtubeVideoId: string; language?: string }): Promise<TranscriptResult>;
}