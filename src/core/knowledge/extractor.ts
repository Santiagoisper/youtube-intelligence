import { z } from "zod";
import type { LLMProvider } from "@/services/llm/types";
import { SchemaValidationError } from "@/core/errors";
import type { KnowledgeExtractor } from "./contracts";
import type { KnowledgeFactInput } from "@/schemas/pipeline";

const factsSchema = z.array(z.object({
  category: z.enum(["model", "tool", "technique", "prompt", "workflow", "api", "skill", "mcp", "plugin", "infrastructure", "claim"]),
  subject: z.string().min(1), predicate: z.string().min(1), value: z.unknown(),
  confidence: z.number().min(0).max(1)
}));
export class LLMKnowledgeExtractor implements KnowledgeExtractor {
  constructor(private readonly provider: LLMProvider) {}
  async extract(input: { videoId: string; analysisMarkdown: string }): Promise<KnowledgeFactInput[]> {
    try {
      return await this.provider.generateStructured({ prompt: input.analysisMarkdown, schema: factsSchema });
    } catch (error) {
      throw new SchemaValidationError(`Knowledge extraction failed for ${input.videoId}`, { cause: error });
    }
  }
}