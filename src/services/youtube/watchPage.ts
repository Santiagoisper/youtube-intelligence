import { YouTubeFetchError } from "@/core/errors";
import { decodeEntities, extractJsonAfterMarker, fetchText } from "./html";

export interface CaptionTrack { baseUrl: string; languageCode: string; kind?: string; name: string; }
export interface WatchPageData {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  captionTracks: CaptionTrack[];
}

interface PlayerResponse {
  playabilityStatus?: { status?: string; reason?: string };
  videoDetails?: { videoId?: string; title?: string; channelId?: string; author?: string };
  captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string; name?: { simpleText?: string } }> } };
}

export async function fetchWatchPage(videoId: string, fetcher: typeof fetch = fetch): Promise<WatchPageData> {
  const html = await fetchText(`https://www.youtube.com/watch?v=${videoId}`, fetcher);
  const playerResponse = extractJsonAfterMarker(html, "ytInitialPlayerResponse = ") as PlayerResponse | undefined;
  if (!playerResponse) throw new YouTubeFetchError(`No se pudo leer la información del video ${videoId}`);

  const status = playerResponse.playabilityStatus?.status;
  if (status && status !== "OK") {
    throw new YouTubeFetchError(`Video no disponible (${status}): ${playerResponse.playabilityStatus?.reason ?? videoId}`);
  }

  const details = playerResponse.videoDetails;
  if (!details?.videoId || !details.title || !details.channelId) {
    throw new YouTubeFetchError(`No se pudo leer metadata del video ${videoId}`);
  }

  const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  return {
    videoId: details.videoId,
    title: decodeEntities(details.title),
    channelId: details.channelId,
    channelName: decodeEntities(details.author ?? details.channelId),
    captionTracks: tracks
      .filter((track): track is Required<Pick<typeof track, "baseUrl" | "languageCode">> & typeof track => Boolean(track.baseUrl && track.languageCode))
      .map((track) => ({ baseUrl: track.baseUrl, languageCode: track.languageCode, kind: track.kind, name: track.name?.simpleText ?? track.languageCode }))
  };
}
