export interface ChannelIndexer {
  indexChannel(input: { youtubeChannelId: string }): Promise<{ channelId: string; videoIds: string[] }>;
}