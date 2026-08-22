import { db } from "@/db/client";
import type { ChannelIndexStore } from "./indexer";
import type { IndexedChannel, IndexedVideo } from "./types";

export class PrismaChannelIndexStore implements ChannelIndexStore {
  async upsertChannel(channel: IndexedChannel): Promise<{ id: string }> {
    const row = await db.channel.upsert({
      where: { youtubeChannelId: channel.youtubeChannelId },
      update: { name: channel.name, handle: channel.handle, url: channel.url, description: channel.description, lastIndexedAt: new Date() },
      create: { youtubeChannelId: channel.youtubeChannelId, name: channel.name, handle: channel.handle, url: channel.url, description: channel.description, lastIndexedAt: new Date() }
    });
    return { id: row.id };
  }

  async upsertVideo(channelId: string, video: IndexedVideo): Promise<{ id: string }> {
    const row = await db.video.upsert({
      where: { youtubeVideoId: video.youtubeVideoId },
      update: { title: video.title, description: video.description, publishedAt: video.publishedAt, duration: video.duration, url: video.url },
      create: { channelId, youtubeVideoId: video.youtubeVideoId, title: video.title, description: video.description, publishedAt: video.publishedAt, duration: video.duration, url: video.url }
    });
    return { id: row.id };
  }

  async listChannelVideos(channelId: string) {
    return db.video.findMany({
      where: { channelId },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, youtubeVideoId: true, title: true, url: true, publishedAt: true, transcriptStatus: true }
    });
  }

  async findVideoByYoutubeId(youtubeVideoId: string) {
    const video = await db.video.findUnique({
      where: { youtubeVideoId },
      select: { id: true, youtubeVideoId: true, title: true, url: true, channelId: true, channel: { select: { name: true } } }
    });
    if (!video) return null;
    return { id: video.id, youtubeVideoId: video.youtubeVideoId, title: video.title, url: video.url, channelId: video.channelId, channelName: video.channel.name };
  }

  async findChannel(channelId: string) {
    return db.channel.findUnique({ where: { id: channelId }, select: { id: true, name: true, youtubeChannelId: true } });
  }

  async listChannels() {
    const channels = await db.channel.findMany({
      orderBy: { lastIndexedAt: "desc" },
      select: { id: true, name: true, handle: true, youtubeChannelId: true, lastIndexedAt: true, _count: { select: { videos: true } } }
    });
    return channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      handle: channel.handle,
      youtubeChannelId: channel.youtubeChannelId,
      lastIndexedAt: channel.lastIndexedAt,
      videoCount: channel._count.videos
    }));
  }
}
