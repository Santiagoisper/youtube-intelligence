import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveYouTubeUrl } from "@/core/pipeline/textExtraction";
import { createTextExtractionDeps } from "@/core/pipeline/deps";
import { PipelineError } from "@/core/errors";

const bodySchema = z.object({ url: z.string().min(1, "Pegá una URL de YouTube") });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "URL inválida" }, { status: 400 });

  try {
    const result = await resolveYouTubeUrl(parsed.data.url, createTextExtractionDeps());
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PipelineError) return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    console.error(error);
    return NextResponse.json({ error: "Error inesperado procesando la URL" }, { status: 500 });
  }
}
