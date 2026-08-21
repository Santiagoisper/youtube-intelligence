import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TranscriptSegment } from "@/schemas/pipeline";
import { env } from "@/lib/env";
import { defaultRunYtDlp, type RunYtDlp } from "./ytdlp";

const execFileAsync = promisify(execFile);
const CHUNK_SECONDS = 600;
const SPLIT_THRESHOLD_BYTES = 20 * 1024 * 1024;

async function downloadAudio(youtubeVideoId: string, dir: string, runYtDlp: RunYtDlp): Promise<string> {
  await runYtDlp([
    "-f", "bestaudio/best",
    "-x", "--audio-format", "mp3",
    "--extractor-args", "youtube:player_client=android",
    "--postprocessor-args", "ffmpeg:-ac 1 -b:a 48k",
    "--no-warnings", "--no-playlist",
    "-o", path.join(dir, "audio.%(ext)s"),
    `https://www.youtube.com/watch?v=${youtubeVideoId}`
  ]);
  const files = await readdir(dir);
  const audioFile = files.find((file) => file.endsWith(".mp3"));
  if (!audioFile) throw new Error("No se pudo descargar el audio del video");
  return path.join(dir, audioFile);
}

async function splitAudio(audioPath: string, dir: string): Promise<string[]> {
  const pattern = path.join(dir, "chunk_%03d.mp3");
  await execFileAsync("ffmpeg", ["-y", "-i", audioPath, "-f", "segment", "-segment_time", String(CHUNK_SECONDS), "-c", "copy", pattern], { windowsHide: true, maxBuffer: 1024 * 1024 * 20 });
  const files = (await readdir(dir)).filter((file) => file.startsWith("chunk_") && file.endsWith(".mp3")).sort();
  return files.map((file) => path.join(dir, file));
}

interface GroqTranscriptionSegment { start: number; end: number; text: string; }
interface GroqTranscriptionResponse { text?: string; language?: string; segments?: GroqTranscriptionSegment[]; error?: { message?: string }; }

async function transcribeChunk(filePath: string, apiKey: string, fetcher: typeof fetch): Promise<GroqTranscriptionResponse> {
  const buffer = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "audio/mpeg" }), path.basename(filePath));
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "verbose_json");
  const response = await fetcher("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  const payload = await response.json() as GroqTranscriptionResponse;
  if (!response.ok) throw new Error(payload.error?.message ?? `Groq transcription failed (${response.status})`);
  return payload;
}

export interface AudioTranscriptionResult { language: string; segments: TranscriptSegment[]; }
export interface TranscribeAudioDeps { runYtDlp?: RunYtDlp; fetcher?: typeof fetch; }

/** Last-resort fallback when YouTube has no captions at all: downloads the audio and transcribes it minute by minute with Groq's Whisper endpoint. */
export async function transcribeVideoAudio(youtubeVideoId: string, deps: TranscribeAudioDeps = {}): Promise<AudioTranscriptionResult> {
  if (!env.GROQ_API_KEY) throw new Error("Falta configurar GROQ_API_KEY para transcribir el audio");
  const runYtDlp = deps.runYtDlp ?? defaultRunYtDlp;
  const fetcher = deps.fetcher ?? fetch;
  const dir = await mkdtemp(path.join(tmpdir(), "yt-audio-"));
  try {
    const audioPath = await downloadAudio(youtubeVideoId, dir, runYtDlp);
    const { size } = await stat(audioPath);
    const chunkPaths = size > SPLIT_THRESHOLD_BYTES ? await splitAudio(audioPath, dir) : [audioPath];

    const segments: TranscriptSegment[] = [];
    let language = "es";
    for (let i = 0; i < chunkPaths.length; i++) {
      const offsetSeconds = i * CHUNK_SECONDS;
      const result = await transcribeChunk(chunkPaths[i], env.GROQ_API_KEY, fetcher);
      if (result.language) language = result.language;
      for (const segment of result.segments ?? []) {
        const text = segment.text.trim();
        if (!text) continue;
        segments.push({ startSeconds: offsetSeconds + segment.start, endSeconds: offsetSeconds + segment.end, text });
      }
    }
    return { language, segments };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
