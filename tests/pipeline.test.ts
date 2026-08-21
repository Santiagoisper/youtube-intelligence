import { describe, expect, it } from "vitest";
import { knowledgeFactSchema, transcriptSegmentSchema } from "@/schemas/pipeline";
import { extractChannelReference } from "@/services/youtube/normalize";
import { normalizeTranscript } from "@/core/transcripts/normalize";
import { SimpleDeltaEngine } from "@/core/delta/engine";
import { InMemoryPipelineStore, PipelineOrchestrator } from "@/core/pipeline/orchestrator";
import { MockLLMProvider } from "@/services/llm/types";
import { classifyVideo } from "@/core/analysis/classification";
import { LLMKnowledgeExtractor } from "@/core/knowledge/extractor";
import { SourceChannelIndexer } from "@/services/youtube/indexer";
import { TranscriptUnavailable } from "@/core/errors";
import { GroqLLMProvider } from "@/services/llm/groq";

describe("pipeline schemas", () => {
  it("accepts a bounded confidence fact", () => expect(knowledgeFactSchema.parse({ category: "tool", subject: "Prisma", predicate: "usedFor", value: "storage", confidence: .9 }).confidence).toBe(.9));
  it("rejects invalid transcript timestamps", () => expect(() => transcriptSegmentSchema.parse({ startSeconds: -1, endSeconds: 2, text: "x" })).toThrow());
});

describe("pipeline stages", () => {
  it("normalizes channel references", () => {
    expect(extractChannelReference("https://www.youtube.com/@technical")).toBe("@technical");
    expect(extractChannelReference("UC123")).toBe("UC123");
  });

  it("separates YouTube fetch, normalization and persistence", async () => {
    const operations: string[] = [];
    const indexer = new SourceChannelIndexer({
      async fetchChannel({ channelUrl }) {
        expect(channelUrl).toBe("@technical");
        return { channel: { youtubeChannelId: "UC1", name: "Technical", url: "https://youtube.com/@technical" }, videos: [{ youtubeVideoId: "v1", title: "Video", url: "https://youtube.com/watch?v=v1" }] };
      }
    }, {
      async upsertChannel() { operations.push("channel"); return { id: "channel-1" }; },
      async upsertVideo(channelId) { operations.push(`video:${channelId}`); return { id: "video-1" }; }
    });
    await expect(indexer.indexChannel({ youtubeChannelId: "https://youtube.com/@technical" })).resolves.toEqual({ channelId: "channel-1", videoIds: ["video-1"] });
    expect(operations).toEqual(["channel", "video:channel-1"]);
  });

  it("normalizes whitespace and drops adjacent duplicate transcript segments", () => {
    const result = normalizeTranscript([
      { startSeconds: 0, endSeconds: 1, text: "  Hola\u00a0 mundo " },
      { startSeconds: 1, endSeconds: 2, text: "Hola mundo" },
      { startSeconds: 2, endSeconds: 3, text: "  siguiente" }
    ]);
    expect(result.text).toBe("Hola mundo siguiente");
    expect(result.segments).toHaveLength(2);
  });

  it("detects new, repeated and changed facts", async () => {
    const engine = new SimpleDeltaEngine();
    const result = await engine.detect({ channelId: "c", facts: [
      { subject: "Tool", predicate: "uses", value: "Claude", existing: true },
      { subject: "Tool", predicate: "uses", value: "Claude" },
      { subject: "Model", predicate: "uses", value: "Grok" }
    ]});
    expect(result.map((item) => item.type)).toEqual(["REPEATED", "NEW"]);
  });

  it("detects replacements through an explicit replaces relationship", async () => {
    const result = await new SimpleDeltaEngine().detect({ channelId: "c", facts: [
      { subject: "Hermes Agent", predicate: "is", value: "agent", existing: true },
      { subject: "Grok Bot", predicate: "replaces", value: "Hermes Agent" }
    ]});
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("REPLACED");
  });

  it("validates LLM classification and knowledge responses", async () => {
    const classification = await classifyVideo(new MockLLMProvider(JSON.stringify({
      classification: "UTIL", confidence: .8, reasons: ["concrete"], topics: ["agents"], models: ["Claude"], tools: ["Prisma"], techniques: ["RAG"]
    })), { title: "Video", transcript: "transcript" });
    const facts = await new LLMKnowledgeExtractor(new MockLLMProvider(JSON.stringify([
      { category: "tool", subject: "Prisma", predicate: "stores", value: "Postgres", confidence: .9 }
    ]))).extract({ videoId: "v1", analysisMarkdown: "# Analysis" });
    expect(classification.classification).toBe("UTIL");
    expect(facts[0]?.subject).toBe("Prisma");
  });

  it("uses Groq's OpenAI-compatible API without calling it in tests", async () => {
    let requestBody = "";
    const provider = new GroqLLMProvider({
      apiKey: "test-key",
      fetcher: async (_input, init) => {
        requestBody = String(init?.body);
        return new Response(JSON.stringify({ choices: [{ message: { content: "respuesta" } }] }), { status: 200 });
      }
    });
    await expect(provider.generateText({ prompt: "hola" })).resolves.toBe("respuesta");
    expect(requestBody).toContain("llama-3.3-70b-versatile");
    expect(requestBody).not.toContain("test-key");
  });

  it("does not process the same video twice", async () => {
    const store = new InMemoryPipelineStore();
    store.videos.set("v1", { id: "v1", title: "Demo", youtubeVideoId: "yt1", facts: [] });
    let transcriptCalls = 0;
    const orchestrator = new PipelineOrchestrator({
      indexer: { async indexChannel() { return { channelId: "c1", videoIds: ["v1"] }; } },
      transcripts: { async getTranscript() { transcriptCalls++; return { status: "AVAILABLE", source: "fixture", language: "es", rawText: "hola", segments: [{ startSeconds: 0, endSeconds: 1, text: "hola" }] }; } },
      analyzer: { async analyze() { return { markdown: "# Analysis", summary: "Analysis", model: "mock", promptVersion: "1" }; } },
      extractor: { async extract() { return [{ category: "tool", subject: "Demo", predicate: "is", value: "useful", confidence: .9 }]; } },
      delta: new SimpleDeltaEngine(),
      store
    });
    await orchestrator.processChannel("@fixture");
    await orchestrator.processChannel("@fixture");
    expect(transcriptCalls).toBe(1);
  });

  it("fails explicitly when a transcript is unavailable", async () => {
    const store = new InMemoryPipelineStore();
    store.videos.set("v2", { id: "v2", title: "No transcript", youtubeVideoId: "yt2", facts: [] });
    const orchestrator = new PipelineOrchestrator({
      indexer: { async indexChannel() { return { channelId: "c1", videoIds: [] }; } },
      transcripts: { async getTranscript() { return { status: "UNAVAILABLE", reason: "Captions disabled" }; } },
      analyzer: { async analyze() { throw new Error("not reached"); } },
      extractor: { async extract() { throw new Error("not reached"); } },
      delta: new SimpleDeltaEngine(), store
    });
    await expect(orchestrator.processVideo("v2", "c1")).rejects.toBeInstanceOf(TranscriptUnavailable);
  });
});