import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchTranscriptsForVideos } from "@/core/pipeline/textExtraction";
import { createTextExtractionDeps } from "@/core/pipeline/deps";
import { PipelineError } from "@/core/errors";

const bodySchema = z.object({ youtubeVideoIds: z.array(z.string().min(1)).min(1, "Elegí al menos un video") });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Selección inválida" }, { status: 400 });

  try {
    const videos = await fetchTranscriptsForVideos(parsed.data.youtubeVideoIds, createTextExtractionDeps());
    return NextResponse.json({ videos });
  } catch (error) {
    if (error instanceof PipelineError) return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    console.error(error);
    return NextResponse.json({ error: "Error inesperado obteniendo transcripciones" }, { status: 500 });
  }
}
