export interface VideoAnalyzer {
  analyze(input: { videoId: string; transcript: string }): Promise<{ markdown: string; summary: string; model: string; promptVersion: string }>;
}