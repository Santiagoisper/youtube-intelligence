import { db } from "@/db/client";
import type { TranscriptSegment } from "@/schemas/pipeline";

export interface TranscriptStore {
  saveTranscript(videoId: string, data: { source: string; language: string; rawText: string; normalizedText: string; segments: TranscriptSegment[] }): Promise<void>;
  markFailed(videoId: string): Promise<void>;
}

export class PrismaTranscriptStore implements TranscriptStore {
  async saveTranscript(videoId: string, data: { source: string; language: string; rawText: string; normalizedText: string; segments: TranscriptSegment[] }): Promise<void> {
    await db.$transaction([
      db.transcript.upsert({
        where: { videoId },
        create: { videoId, source: data.source, language: data.language, rawText: data.rawText, normalizedText: data.normalizedText, segments: data.segments },
        update: { source: data.source, language: data.language, rawText: data.rawText, normalizedText: data.normalizedText, segments: data.segments, fetchedAt: new Date() }
      }),
      db.video.update({ where: { id: videoId }, data: { transcriptStatus: "COMPLETED", status: "READY" } })
    ]);
  }

  async markFailed(videoId: string): Promise<void> {
    await db.video.update({ where: { id: videoId }, data: { transcriptStatus: "FAILED", status: "FAILED" } });
  }
}
