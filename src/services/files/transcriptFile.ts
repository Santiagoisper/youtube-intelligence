import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_ROOT = "C:\\Users\\Santiago\\source\\repos\\Santiagoisper\\YOUTUBE ANALIZER";

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "sin-titulo";
}

/** Writes a transcript as `<channelName>/<videoTitle>.txt` under the shared output folder and returns the absolute path written. */
export async function saveTranscriptFile(channelName: string, videoTitle: string, text: string): Promise<string> {
  const dir = path.join(OUTPUT_ROOT, sanitize(channelName));
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${sanitize(videoTitle)}.txt`);
  await writeFile(filePath, text, "utf-8");
  return filePath;
}
