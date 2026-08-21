import { YouTubeHttpSource } from "@/services/youtube/source";
import { YouTubeTranscriptProvider } from "@/services/youtube/transcripts";
import { PrismaChannelIndexStore } from "@/services/youtube/prismaStore";
import { PrismaTranscriptStore } from "@/services/youtube/prismaTranscriptStore";
import type { TextExtractionDeps } from "./textExtraction";

export function createTextExtractionDeps(): TextExtractionDeps {
  return {
    source: new YouTubeHttpSource(),
    channelStore: new PrismaChannelIndexStore(),
    transcripts: new YouTubeTranscriptProvider(),
    transcriptStore: new PrismaTranscriptStore()
  };
}
