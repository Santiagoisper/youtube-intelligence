import type { ChannelIndexer } from "@/core/channels/contracts";
import type { TranscriptProvider } from "@/core/transcripts/contracts";
import type { VideoAnalyzer } from "@/core/analysis/contracts";
import type { KnowledgeExtractor } from "@/core/knowledge/contracts";
import type { DeltaEngine } from "@/core/delta/contracts";
import { normalizeTranscript } from "@/core/transcripts/normalize";
import type { KnowledgeFactInput } from "@/schemas/pipeline";
import { TranscriptProviderError, TranscriptUnavailable } from "@/core/errors";

export interface PipelineVideo { id: string; title: string; youtubeVideoId: string; transcript?: string; analysis?: string; facts: KnowledgeFactInput[]; processedAt?: Date; }
export interface PipelineStore {
  getVideo(videoId: string): Promise<PipelineVideo | undefined>;
  saveVideo(video: PipelineVideo): Promise<void>;
  getChannelFacts(channelId: string): Promise<KnowledgeFactInput[]>;
  saveDeltas(channelId: string, deltas: unknown[]): Promise<void>;
}

export class InMemoryPipelineStore implements PipelineStore {
  readonly videos = new Map<string, PipelineVideo>();
  readonly channelFacts = new Map<string, KnowledgeFactInput[]>();
  readonly deltas = new Map<string, unknown[]>();
  async getVideo(videoId: string) { return this.videos.get(videoId); }
  async saveVideo(video: PipelineVideo) { this.videos.set(video.id, video); }
  async getChannelFacts(channelId: string) { return this.channelFacts.get(channelId) ?? []; }
  async saveDeltas(channelId: string, deltas: unknown[]) { this.deltas.set(channelId, deltas); }
}

export class PipelineOrchestrator {
  constructor(
    private readonly dependencies: {
      indexer: ChannelIndexer;
      transcripts: TranscriptProvider;
      analyzer: VideoAnalyzer;
      extractor: KnowledgeExtractor;
      delta: DeltaEngine;
      store: PipelineStore;
    }
  ) {}

  async processVideo(videoId: string, channelId: string): Promise<{ video: PipelineVideo; deltas: unknown[] }> {
    const existing = await this.dependencies.store.getVideo(videoId);
    if (existing?.processedAt) return { video: existing, deltas: [] };
    if (!existing) throw new Error(`Video ${videoId} not found`);
    const transcript = await this.dependencies.transcripts.getTranscript({ youtubeVideoId: existing.youtubeVideoId });
    if (transcript.status === "UNAVAILABLE") throw new TranscriptUnavailable(transcript.reason);
    if (transcript.status === "FAILED") throw new TranscriptProviderError(transcript.reason);
    const normalized = normalizeTranscript(transcript.segments, transcript.rawText);
    const analysis = await this.dependencies.analyzer.analyze({ videoId, transcript: normalized.text });
    const facts = await this.dependencies.extractor.extract({ videoId, analysisMarkdown: analysis.markdown });
    const oldFacts = await this.dependencies.store.getChannelFacts(channelId);
    const deltaInput = [...oldFacts.map((fact) => ({ ...fact, existing: true })), ...facts];
    const deltas = await this.dependencies.delta.detect({ channelId, facts: deltaInput });
    const completed = { ...existing, transcript: normalized.text, analysis: analysis.markdown, facts, processedAt: new Date() };
    await this.dependencies.store.saveVideo(completed);
    await this.dependencies.store.saveDeltas(channelId, deltas);
    return { video: completed, deltas };
  }

  async processChannel(channelUrl: string): Promise<{ channelId: string; processedVideoIds: string[] }> {
    const indexed = await this.dependencies.indexer.indexChannel({ youtubeChannelId: channelUrl });
    const processedVideoIds: string[] = [];
    for (const videoId of indexed.videoIds) {
      await this.processVideo(videoId, indexed.channelId);
      processedVideoIds.push(videoId);
    }
    return { channelId: indexed.channelId, processedVideoIds };
  }
}