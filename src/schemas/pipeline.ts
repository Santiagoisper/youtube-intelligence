import { z } from "zod";

export const transcriptSegmentSchema = z.object({
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().nonnegative(),
  text: z.string().min(1)
});
export const knowledgeFactSchema = z.object({
  category: z.enum(["model", "tool", "technique", "prompt", "workflow", "api", "skill", "mcp", "plugin", "infrastructure", "claim"]),
  subject: z.string().min(1),
  predicate: z.string().min(1),
  value: z.unknown(),
  confidence: z.number().min(0).max(1)
});
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
export type KnowledgeFactInput = z.infer<typeof knowledgeFactSchema>;