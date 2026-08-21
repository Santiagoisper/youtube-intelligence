import type { ZodType } from "zod";

export interface GenerateTextInput {
  system?: string;
  prompt: string;
  model?: string;
  temperature?: number;
}
export interface LLMProvider {
  readonly name: string;
  generateText(input: GenerateTextInput): Promise<string>;
  generateStructured<T>(input: GenerateTextInput & { schema: ZodType<T> }): Promise<T>;
}

export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";
  constructor(private readonly response = "") {}
  async generateText(): Promise<string> { return this.response; }
  async generateStructured<T>(input: GenerateTextInput & { schema: ZodType<T> }): Promise<T> {
    return input.schema.parse(JSON.parse(this.response)) as T;
  }
}