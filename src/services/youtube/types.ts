export interface IndexedChannel { youtubeChannelId: string; name: string; handle?: string; url: string; description?: string; }
export interface IndexedVideo { youtubeVideoId: string; title: string; description?: string; publishedAt?: Date; duration?: number; url: string; }
export interface YouTubeSource { fetchChannel(input: { channelUrl: string }): Promise<{ channel: IndexedChannel; videos: IndexedVideo[] }>; }
export interface YouTubeVideoSource { fetchVideo(input: { videoId: string }): Promise<{ channel: IndexedChannel; video: IndexedVideo }>; }