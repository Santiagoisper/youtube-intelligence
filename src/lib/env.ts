import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GROQ_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  GROQ_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
  TRANSCRIPT_OUTPUT_DIR: z.string().min(1).default("./data/transcripts"),
  APP_ENV: z.enum(["development", "test", "production"]).default("development")
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL,
  TRANSCRIPT_OUTPUT_DIR: process.env.TRANSCRIPT_OUTPUT_DIR,
  APP_ENV: process.env.APP_ENV
});
