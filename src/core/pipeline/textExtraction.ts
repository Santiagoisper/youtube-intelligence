import type { TranscriptProvider } from "@/core/transcripts/contracts";
import { normalizeTranscript } from "@/core/transcripts/normalize";
import { SourceChannelIndexer, type ChannelIndexStore } from "@/services/youtube/indexer";
import { extractChannelReference, extractVideoReference } from "@/services/youtube/normalize";
import type { IndexedVideo, YouTubeSource, YouTubeVideoSource } from "@/services/youtube/types";
import type { TranscriptStore } from "@/services/youtube/prismaTranscriptStore";
import { saveTranscriptFile } from "@/services/files/transcriptFile";

export interface DiscoveredVideo { youtubeVideoId: string; title: string; url: string; publishedAt?: Date; transcriptStatus: string; }
export type ResolveResult =
  | { type: "video"; channel: { id: string; name: string }; video: TranscriptOutcome }
  | { type: "channel"; channel: { id: string; name: string; youtubeChannelId: string }; videos: DiscoveredVideo[] };

export interface TranscriptOutcome {
  videoId: string;
  youtubeVideoId: string;
  title: string;
  url: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "FAILED";
  text?: string;
  filePath?: string;
  reason?: string;
}

export interface TextExtractionDeps {
  source: YouTubeSource & YouTubeVideoSource;
  channelStore: ChannelIndexStore & {
    listChannelVideos(channelId: string): Promise<{ id: string; youtubeVideoId: string; title: string; url: string; publishedAt: Date | null; transcriptStatus: string }[]>;
    findVideoByYoutubeId(youtubeVideoId: string): Promise<{ id: string; youtubeVideoId: string; title: string; url: string; channelId: string; channelName: string } | null>;
    findChannel(channelId: string): Promise<{ id: string; name: string; youtubeChannelId: string } | null>;
  };
  transcripts: TranscriptProvider;
  transcriptStore: TranscriptStore;
}

async function fetchAndPersistTranscript(videoRowId: string, video: Pick<IndexedVideo, "youtubeVideoId" | "title" | "url">, channelName: string, deps: TextExtractionDeps): Promise<TranscriptOutcome> {
  const result = await deps.transcripts.getTranscript({ youtubeVideoId: video.youtubeVideoId });
  const base = { videoId: videoRowId, youtubeVideoId: video.youtubeVideoId, title: video.title, url: video.url };
  if (result.status !== "AVAILABLE") {
    await deps.transcriptStore.markFailed(videoRowId);
    return { ...base, status: result.status, reason: result.reason };
  }
  const normalized = normalizeTranscript(result.segments, result.rawText);
  await deps.transcriptStore.saveTranscript(videoRowId, { source: result.source, language: result.language, rawText: result.rawText, normalizedText: normalized.text, segments: result.segments });
  const filePath = await saveTranscriptFile(channelName, video.title, normalized.text);
  return { ...base, status: "AVAILABLE", text: normalized.text, filePath };
}

/** Resolves a pasted URL: a single video gets its transcript right away; a channel only gets indexed and its video list returned so the user can pick what to fetch. */
export async function resolveYouTubeUrl(url: string, deps: TextExtractionDeps): Promise<ResolveResult> {
  const videoRef = extractVideoReference(url);
  if (videoRef) {
    const { channel, video } = await deps.source.fetchVideo({ videoId: videoRef });
    const channelRow = await deps.channelStore.upsertChannel(channel);
    const videoRow = await deps.channelStore.upsertVideo(channelRow.id, video);
    const outcome = await fetchAndPersistTranscript(videoRow.id, video, channel.name, deps);
    return { type: "video", channel: { id: channelRow.id, name: channel.name }, video: outcome };
  }

  const channelRef = extractChannelReference(url);
  const indexer = new SourceChannelIndexer(deps.source, deps.channelStore);
  const indexed = await indexer.indexChannel({ youtubeChannelId: channelRef });
  const channel = await deps.channelStore.findChannel(indexed.channelId);
  const videos = await deps.channelStore.listChannelVideos(indexed.channelId);
  return {
    type: "channel",
    channel: channel ?? { id: indexed.channelId, name: channelRef, youtubeChannelId: channelRef },
    videos: videos.map((video) => ({ youtubeVideoId: video.youtubeVideoId, title: video.title, url: video.url, publishedAt: video.publishedAt ?? undefined, transcriptStatus: video.transcriptStatus }))
  };
}

/** Fetches transcripts for videos the user explicitly selected from a previously discovered channel. */
export async function fetchTranscriptsForVideos(youtubeVideoIds: string[], deps: TextExtractionDeps): Promise<TranscriptOutcome[]> {
  const outcomes: TranscriptOutcome[] = [];
  for (const youtubeVideoId of youtubeVideoIds) {
    const video = await deps.channelStore.findVideoByYoutubeId(youtubeVideoId);
    if (!video) {
      outcomes.push({ videoId: "", youtubeVideoId, title: youtubeVideoId, url: `https://www.youtube.com/watch?v=${youtubeVideoId}`, status: "FAILED", reason: "Video no encontrado; volvé a pegar la URL del canal" });
      continue;
    }
    outcomes.push(await fetchAndPersistTranscript(video.id, video, video.channelName, deps));
  }
  return outcomes;
}
