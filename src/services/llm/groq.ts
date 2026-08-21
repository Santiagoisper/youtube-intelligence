import type { ZodType } from "zod";
import { AnalysisError } from "@/core/errors";
import type { GenerateTextInput, LLMProvider } from "./types";

interface GroqResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

export interface GroqConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export class GroqLLMProvider implements LLMProvider {
  readonly name = "groq";
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(private readonly config: GroqConfig) {
    this.model = config.model ?? "llama-3.3-70b-versatile";
    this.baseUrl = (config.baseUrl ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
    this.fetcher = config.fetcher ?? fetch;
  }

  async generateText(input: GenerateTextInput): Promise<string> {
    const response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model ?? this.model,
        temperature: input.temperature ?? 0,
        messages: [
          ...(input.system ? [{ role: "system", content: input.system }] : []),
          { role: "user", content: input.prompt }
        ]
      })
    });
    const payload = await response.json() as GroqResponse;
    if (!response.ok) throw new AnalysisError(`Groq request failed: ${payload.error?.message ?? response.statusText}`);
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new AnalysisError("Groq returned an empty response");
    return content;
  }

  async generateStructured<T>(input: GenerateTextInput & { schema: ZodType<T> }): Promise<T> {
    const content = await this.generateJson(input);
    try {
      return input.schema.parse(JSON.parse(content));
    } catch (error) {
      throw new AnalysisError("Groq returned invalid structured output", { cause: error });
    }
  }

  private async generateJson(input: GenerateTextInput): Promise<string> {
    const response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model ?? this.model,
        temperature: input.temperature ?? 0,
        response_format: { type: "json_object" },
        messages: [
          ...(input.system ? [{ role: "system", content: `${input.system}\nReturn only valid JSON.` }] : [{ role: "system", content: "Return only valid JSON." }]),
          { role: "user", content: input.prompt }
        ]
      })
    });
    const payload = await response.json() as GroqResponse;
    if (!response.ok) throw new AnalysisError(`Groq request failed: ${payload.error?.message ?? response.statusText}`);
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new AnalysisError("Groq returned an empty structured response");
    return content;
  }
}