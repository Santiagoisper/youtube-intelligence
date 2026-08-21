import { env } from "@/lib/env";
import { GroqLLMProvider } from "./groq";
import type { LLMProvider } from "./types";

export function createLLMProvider(): LLMProvider {
  if (!env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is required to use the Groq LLM provider");
  return new GroqLLMProvider({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL });
}