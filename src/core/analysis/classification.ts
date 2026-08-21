import { z } from "zod";
import type { LLMProvider } from "@/services/llm/types";
import { AnalysisError } from "@/core/errors";
import { readVersionedPrompt } from "@/lib/prompts";

export const classificationSchema = z.object({
  classification: z.enum(["IMPRESCINDIBLE", "UTIL", "REPETITIVO", "DESACTUALIZADO", "HYPE_MARKETING"]),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  topics: z.array(z.string()),
  models: z.array(z.string()),
  tools: z.array(z.string()),
  techniques: z.array(z.string())
});
export type VideoClassification = z.infer<typeof classificationSchema>;

export async function classifyVideo(provider: LLMProvider, input: { title: string; transcript: string }): Promise<VideoClassification> {
  try {
    const prompt = await readVersionedPrompt("classify-video.md");
    return await provider.generateStructured({ system: prompt.content, prompt: `Video title: ${input.title}\n\nTranscript:\n${input.transcript}`, schema: classificationSchema });
  } catch (error) {
    throw new AnalysisError("Video classification failed", { cause: error });
  }
}