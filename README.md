# YouTube Intelligence

Pegás la URL de un video de YouTube o de un canal y la app extrae la transcripción completa, minuto a minuto, y la guarda como `.txt` organizada por canal. Pensada para investigar, resumir o alimentar otros pipelines de IA con lo que se dice en un video sin tener que mirarlo entero.

## Qué hace

- **Video individual** (`youtube.com/watch?v=...`): resuelve el título y el canal, descarga la transcripción y la guarda en disco al toque.
- **Canal** (`youtube.com/@handle`): lista los últimos videos del canal con su fecha de publicación; elegís con checkboxes cuáles te interesan y solo esos se transcriben.
- **Subtítulos reales primero**: usa los subtítulos (manuales o automáticos) que ya tiene el video en YouTube.
- **Fallback a IA cuando no hay subtítulos**: si el video no tiene subtítulos en YouTube, baja el audio y lo transcribe con Whisper (vía Groq), partiendo el audio en tramos para videos largos.
- **Salida como archivo**: cada transcripción se guarda como texto plano, agrupada en una carpeta con el nombre del canal.
- Guarda todo también en Postgres (canal, video, transcripción) vía Prisma, como base para el resto del pipeline (análisis, extracción de conocimiento, detección de cambios — ver `docs/`).

## Cómo funciona por dentro

YouTube bloquea el scraping directo de sus endpoints de subtítulos y de listado de canal para clientes no-browser (devuelven 200 vacío o 404). Por eso la extracción usa [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) como motor — se mantiene activamente actualizado contra esos bloqueos — tanto para listar los videos de un canal como para bajar subtítulos y audio. Los metadatos de un video individual (título, canal) sí se resuelven con un fetch HTTP directo a la página, que no está bloqueado.

Arquitectura del código en `docs/ARCHITECTURE.md`, `docs/PIPELINE_CONTRACTS.md` y `docs/DATA_MODEL.md`.

## Requisitos

- Node.js 20+
- PostgreSQL
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) instalado y en el `PATH`
- `ffmpeg` instalado y en el `PATH` (lo usa `yt-dlp` para extraer/recortar audio)
- Una API key de [Groq](https://console.groq.com) (opcional para transcripción por IA; hace falta tener habilitados los modelos `whisper-large-v3` / `whisper-large-v3-turbo` en la organización)

## Setup

```bash
npm install
cp .env.example .env   # completá DATABASE_URL y GROQ_API_KEY
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Abrí `http://localhost:3000/channels` y pegá una URL.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm run start` — build y arranque de producción
- `npm run typecheck` — chequeo de tipos
- `npm run lint` — ESLint
- `npm test` / `npm run test:watch` — tests con Vitest

## Notas

- Los archivos de transcripción se guardan en una carpeta configurada en `src/services/files/transcriptFile.ts` — ajustala a tu entorno antes de correr en otra máquina.
- El listado de un canal trae hasta 25 videos (los más recientes).
- Esta app hace llamadas reales a YouTube y, si corresponde, a Groq — no hay stubs en producción.
