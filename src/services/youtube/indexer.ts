import type { ChannelIndexer } from "@/core/channels/contracts";
import type { IndexedChannel, IndexedVideo, YouTubeSource } from "./types";
import { extractChannelReference } from "./normalize";

export interface ChannelIndexStore {
  upsertChannel(channel: IndexedChannel): Promise<{ id: string }>;
  upsertVideo(channelId: string, video: IndexedVideo): Promise<{ id: string }>;
}

export class SourceChannelIndexer implements ChannelIndexer {
  constructor(private readonly source: YouTubeSource, private readonly store: ChannelIndexStore) {}
  async indexChannel(input: { youtubeChannelId: string }): Promise<{ channelId: string; videoIds: string[] }> {
    const channelUrl = extractChannelReference(input.youtubeChannelId);
    const indexed = await this.source.fetchChannel({ channelUrl });
    const channel = await this.store.upsertChannel(indexed.channel);
    const videoIds = await Promise.all(indexed.videos.map(async (video) => (await this.store.upsertVideo(channel.id, video)).id));
    return { channelId: channel.id, videoIds };
  }
}