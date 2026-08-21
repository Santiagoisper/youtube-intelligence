import type { KnowledgeFactInput } from "@/schemas/pipeline";
export interface KnowledgeExtractor {
  extract(input: { videoId: string; analysisMarkdown: string }): Promise<KnowledgeFactInput[]>;
}