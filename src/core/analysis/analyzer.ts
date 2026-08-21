import type { LLMProvider } from "@/services/llm/types";
import { AnalysisError } from "@/core/errors";
import type { VideoAnalyzer } from "./contracts";
import { readVersionedPrompt } from "@/lib/prompts";

export class LLMVideoAnalyzer implements VideoAnalyzer {
  constructor(private readonly provider: LLMProvider, private readonly prompt: string, private readonly promptVersion = "1.0.0") {}
  async analyze(input: { videoId: string; transcript: string }) {
    try {
      const markdown = await this.provider.generateText({ system: this.prompt, prompt: input.transcript });
      return { markdown, summary: markdown.split("\n").find(Boolean)?.slice(0, 280) ?? "", model: this.provider.name, promptVersion: this.promptVersion };
    } catch (error) {
      throw new AnalysisError(`Analysis failed for ${input.videoId}`, { cause: error });
    }
  }
}

export async function createVideoAnalyzer(provider: LLMProvider): Promise<LLMVideoAnalyzer> {
  const prompt = await readVersionedPrompt("analyze-video.md");
  return new LLMVideoAnalyzer(provider, prompt.content, prompt.version);
}