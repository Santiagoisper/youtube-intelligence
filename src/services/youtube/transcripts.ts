import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TranscriptSegment } from "@/schemas/pipeline";
import type { TranscriptProvider, TranscriptResult } from "@/core/transcripts/contracts";
import { TranscriptProviderError } from "@/core/errors";
import { decodeEntities } from "./html";
import { defaultRunYtDlp, type RunYtDlp } from "./ytdlp";
import { transcribeVideoAudio, type TranscribeAudioDeps } from "./transcribeAudio";

function parseVttTime(value: string): number {
  const [hours, minutes, seconds] = value.split(":");
  return parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseFloat(seconds);
}

/** Parses WebVTT cues into transcript segments, stripping inline markup and dropping adjacent duplicate lines (common in auto-generated captions). */
function parseVtt(content: string): TranscriptSegment[] {
  const lines = content.replace(/\r/g, "").split("\n");
  const cueTime = /^(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/;
  const segments: TranscriptSegment[] = [];
  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(cueTime);
    if (match) {
      const startSeconds = parseVttTime(match[1]);
      const endSeconds = parseVttTime(match[2]);
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") { textLines.push(lines[i]); i++; }
      const text = decodeEntities(textLines.join(" ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
      const previous = segments.at(-1);
      if (text && previous?.text.toLowerCase() !== text.toLowerCase()) segments.push({ startSeconds, endSeconds, text });
    }
    i++;
  }
  return segments;
}

export class YouTubeTranscriptProvider implements TranscriptProvider {
  constructor(
    private readonly runYtDlp: RunYtDlp = defaultRunYtDlp,
    private readonly audioDeps: TranscribeAudioDeps = {}
  ) {}

  async getTranscript(input: { youtubeVideoId: string; language?: string }): Promise<TranscriptResult> {
    const captions = await this.getCaptionTranscript(input);
    if (captions.status === "AVAILABLE") return captions;
    return this.transcribeAudioFallback(input.youtubeVideoId);
  }

  private async getCaptionTranscript(input: { youtubeVideoId: string; language?: string }): Promise<TranscriptResult> {
    const dir = await mkdtemp(path.join(tmpdir(), "yt-transcript-"));
    try {
      const preferred = input.language ? `${input.language}.*,${input.language},` : "";
      const langs = `${preferred}es.*,es,en.*,en,pt.*,pt`;
      try {
        await this.runYtDlp([
          "--skip-download",
          "--write-sub",
          "--write-auto-sub",
          "--sub-langs", langs,
          "--sub-format", "vtt",
          "--no-warnings",
          "--no-playlist",
          "-o", path.join(dir, "subs.%(ext)s"),
          `https://www.youtube.com/watch?v=${input.youtubeVideoId}`
        ]);
      } catch {
        // yt-dlp can exit non-zero after already writing a usable subtitle (e.g. rate-limited on a
        // secondary auto-translated language); what matters is whether a .vtt file landed on disk.
      }

      const files = (await readdir(dir)).filter((file) => file.endsWith(".vtt")).sort();
      if (!files.length) return { status: "UNAVAILABLE", reason: "Este video no tiene subtítulos disponibles" };

      const chosen = files[0];
      const languageCode = chosen.split(".").slice(1, -1).join(".") || "unknown";
      const content = await readFile(path.join(dir, chosen), "utf-8");
      const segments = parseVtt(content);
      if (!segments.length) return { status: "UNAVAILABLE", reason: "El subtítulo encontrado está vacío" };

      return {
        status: "AVAILABLE",
        source: "youtube",
        language: languageCode,
        rawText: segments.map((segment) => segment.text).join(" "),
        segments
      };
    } catch (error) {
      throw new TranscriptProviderError(`No se pudo obtener el transcript de ${input.youtubeVideoId}`, { cause: error });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  /** Cuando YouTube no tiene subtítulos (ni manuales ni automáticos), transcribimos el audio nosotros mismos con Whisper. */
  private async transcribeAudioFallback(youtubeVideoId: string): Promise<TranscriptResult> {
    try {
      const result = await transcribeVideoAudio(youtubeVideoId, this.audioDeps);
      if (!result.segments.length) return { status: "UNAVAILABLE", reason: "No se pudo transcribir el audio del video" };
      return {
        status: "AVAILABLE",
        source: "groq-whisper",
        language: result.language,
        rawText: result.segments.map((segment) => segment.text).join(" "),
        segments: result.segments
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "No se pudo transcribir el audio del video";
      return { status: "UNAVAILABLE", reason };
    }
  }
}
