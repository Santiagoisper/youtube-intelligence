import { YouTubeFetchError } from "@/core/errors";
import type { IndexedChannel, IndexedVideo, YouTubeSource, YouTubeVideoSource } from "./types";
import { defaultRunYtDlp, type RunYtDlp } from "./ytdlp";

interface PlaylistEntry { id?: string; title?: string; url?: string; timestamp?: number; upload_date?: string; }
interface PlaylistResult { channel_id?: string; channel?: string; description?: string; entries?: PlaylistEntry[]; }
interface VideoResult {
  id?: string;
  title?: string;
  channel_id?: string;
  channel?: string;
  uploader?: string;
  webpage_url?: string;
}

function parseUploadDate(entry: PlaylistEntry): Date | undefined {
  if (entry.timestamp) return new Date(entry.timestamp * 1000);
  if (entry.upload_date && /^\d{8}$/.test(entry.upload_date)) {
    const year = entry.upload_date.slice(0, 4);
    const month = entry.upload_date.slice(4, 6);
    const day = entry.upload_date.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  return undefined;
}

const MAX_CHANNEL_VIDEOS = 25;

function channelVideosUrl(channelRef: string): string {
  if (channelRef.startsWith("http")) {
    const url = new URL(channelRef);
    return `https://www.youtube.com${url.pathname.replace(/\/$/, "").replace(/\/videos$/, "")}/videos`;
  }
  if (channelRef.startsWith("UC")) return `https://www.youtube.com/channel/${channelRef}/videos`;
  return `https://www.youtube.com/${channelRef.replace(/^\//, "")}/videos`;
}

export class YouTubeHttpSource implements YouTubeSource, YouTubeVideoSource {
  constructor(
    private readonly runYtDlp: RunYtDlp = defaultRunYtDlp
  ) {}

  async fetchChannel(input: { channelUrl: string }): Promise<{ channel: IndexedChannel; videos: IndexedVideo[] }> {
    const videosUrl = channelVideosUrl(input.channelUrl);
    let stdout: string;
    try {
      ({ stdout } = await this.runYtDlp(["--playlist-end", String(MAX_CHANNEL_VIDEOS), "--skip-download", "--no-warnings", "--extractor-args", "youtube:lang=es", "-J", videosUrl]));
    } catch (error) {
      throw new YouTubeFetchError(`No se pudo leer el canal ${input.channelUrl}`, { cause: error });
    }

    let data: PlaylistResult;
    try {
      data = JSON.parse(stdout);
    } catch (error) {
      throw new YouTubeFetchError(`Respuesta inesperada al leer el canal ${input.channelUrl}`, { cause: error });
    }
    if (!data.channel_id) throw new YouTubeFetchError(`No se pudo resolver el canal: ${input.channelUrl}`);

    const channel: IndexedChannel = {
      youtubeChannelId: data.channel_id,
      name: data.channel ?? input.channelUrl,
      handle: input.channelUrl.startsWith("@") ? input.channelUrl : undefined,
      url: `https://www.youtube.com/channel/${data.channel_id}`,
      description: data.description
    };
    const videos: IndexedVideo[] = (data.entries ?? [])
      .filter((entry): entry is PlaylistEntry & { id: string; title: string } => Boolean(entry.id && entry.title))
      .map((entry) => ({ youtubeVideoId: entry.id, title: entry.title, url: entry.url ?? `https://www.youtube.com/watch?v=${entry.id}`, publishedAt: parseUploadDate(entry) }));
    return { channel, videos };
  }

  async fetchVideo(input: { videoId: string }): Promise<{ channel: IndexedChannel; video: IndexedVideo }> {
    let stdout: string;
    try {
      ({ stdout } = await this.runYtDlp([
        "--no-warnings",
        "--no-playlist",
        "--no-download",
        "--dump-single-json",
        `https://www.youtube.com/watch?v=${input.videoId}`
      ]));
    } catch (error) {
      throw new YouTubeFetchError(`No se pudo leer el video ${input.videoId} con yt-dlp`, { cause: error });
    }

    let data: VideoResult;
    try {
      data = JSON.parse(stdout);
    } catch (error) {
      throw new YouTubeFetchError(`Respuesta inesperada al leer el video ${input.videoId}`, { cause: error });
    }
    if (!data.id || !data.title || !data.channel_id) {
      throw new YouTubeFetchError(`No se pudo resolver título y canal del video ${input.videoId}`);
    }

    const channel: IndexedChannel = {
      youtubeChannelId: data.channel_id,
      name: data.channel ?? data.uploader ?? data.channel_id,
      url: `https://www.youtube.com/channel/${data.channel_id}`
    };
    const video: IndexedVideo = {
      youtubeVideoId: data.id,
      title: data.title,
      url: data.webpage_url ?? `https://www.youtube.com/watch?v=${data.id}`
    };
    return { channel, video };
  }
}
