# Contratos del pipeline

Todos los contratos son async y viven en `src/core/**/contracts.ts`. Las implementaciones no deben importar proveedores concretos desde `core`.

## Reglas comunes

- **Input/output:** validar inputs externos con Zod; devolver resultados serializables y estables.
- **Errores:** errores de proveedor, validación y persistencia deben propagarse con contexto; no convertir un fallo en un resultado vacío.
- **Side effects:** cada etapa debe ser idempotente por el ID de la entidad y reportar el estado de procesamiento.
- **Persistencia:** el owner de cada etapa escribe su artefacto en Prisma antes de devolver éxito.

`ChannelIndexer.indexChannel({ youtubeChannelId })` devuelve `{ channelId, videoIds }`; crea/actualiza Channel y Videos. `SourceChannelIndexer` separa explícitamente fetch (`YouTubeSource`), normalización de URL/handle y persistencia (`ChannelIndexStore`).

`TranscriptProvider.getTranscript({ youtubeVideoId, language? })` devuelve fuente, idioma, texto y segmentos con timestamps; no modifica videos.

`VideoAnalyzer.analyze({ videoId, transcript })` devuelve Markdown, summary, model y promptVersion; persiste VideoAnalysis y marca analysisStatus.

`KnowledgeExtractor.extract({ videoId, analysisMarkdown })` devuelve hechos con categoría, subject, predicate, value y confidence; persiste KnowledgeFact.

`DeltaEngine.detect({ channelId, facts })` devuelve cambios con tipo, subject y explicación; persiste ChangeEvent. Debe distinguir `NEW`, `CHANGED`, `REPEATED`, `CONTRADICTED`, `DEPRECATED` y `REPLACED`.

`LLMProvider.generateText` recibe system/prompt/model/temperature y devuelve texto. `generateStructured<T>` recibe además un schema Zod y devuelve el valor validado. Las implementaciones deben ocultar autenticación, endpoint y formato del proveedor; la aplicación solo depende de esta interfaz.

## Implementación local y errores

`PipelineOrchestrator` expone `processVideo(videoId, channelId)` y `processChannel(channelUrl)`. Es idempotente en una ejecución ya completada: no vuelve a pedir transcript, análisis ni extracción para el mismo video.

Los errores tipados son `YouTubeFetchError`, `TranscriptUnavailable`, `TranscriptProviderError`, `AnalysisError`, `SchemaValidationError` y `PersistenceError`. Los providers deben lanzar el error correspondiente y nunca inventar transcript cuando no está disponible.