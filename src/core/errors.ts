export class PipelineError extends Error {
  constructor(message: string, readonly code: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PipelineError";
  }
}
export class YouTubeFetchError extends PipelineError { constructor(message: string, options?: { cause?: unknown }) { super(message, "YOUTUBE_FETCH_ERROR", options); this.name = "YouTubeFetchError"; } }
export class TranscriptUnavailable extends PipelineError { constructor(message: string) { super(message, "TRANSCRIPT_UNAVAILABLE"); this.name = "TranscriptUnavailable"; } }
export class TranscriptProviderError extends PipelineError { constructor(message: string, options?: { cause?: unknown }) { super(message, "TRANSCRIPT_PROVIDER_ERROR", options); this.name = "TranscriptProviderError"; } }
export class AnalysisError extends PipelineError { constructor(message: string, options?: { cause?: unknown }) { super(message, "ANALYSIS_ERROR", options); this.name = "AnalysisError"; } }
export class SchemaValidationError extends PipelineError { constructor(message: string, options?: { cause?: unknown }) { super(message, "SCHEMA_VALIDATION_ERROR", options); this.name = "SchemaValidationError"; } }
export class PersistenceError extends PipelineError { constructor(message: string, options?: { cause?: unknown }) { super(message, "PERSISTENCE_ERROR", options); this.name = "PersistenceError"; } }