import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readVersionedPrompt(filename: string): Promise<{ version: string; content: string }> {
  const content = await readFile(path.join(process.cwd(), "prompts", filename), "utf8");
  const version = content.match(/^version:\s*([^\s]+)$/m)?.[1];
  if (!version) throw new Error(`Prompt ${filename} is missing version metadata`);
  return { version, content };
}