# Desarrollo local

Requiere Node.js 20+, PostgreSQL y npm.

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Validaciones: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

El pipeline local no llama APIs de YouTube ni LLMs reales por defecto. Los adapters `YouTubeSource`, `TranscriptProvider` y `LLMProvider` se inyectan; los tests usan stubs y `MockLLMProvider` deterministas.

## Groq

El provider activo se construye con `createLLMProvider()` y utiliza Groq por su API compatible con OpenAI. Configurá `GROQ_API_KEY` como Secret de Replit (nunca en código ni en Git) y, opcionalmente, `GROQ_MODEL`. El default es `llama-3.3-70b-versatile`.

## Ownership

La arquitectura y el pipeline pertenecen al mismo proyecto y los implemento yo de forma incremental. Las superficies del pipeline son `src/services/youtube/**`, `src/core/transcripts/**`, `src/core/analysis/**`, `src/core/knowledge/**` y `src/core/delta/**`; deben respetar los contratos y sus cambios se hacen en este repositorio, no en una rama de un agente externo.

Las modificaciones a `src/schemas/**`, `prisma/schema.prisma` y `src/services/llm/**` se coordinan con los contratos existentes para evitar incompatibilidades.