"use client";

import { useState, type FormEvent } from "react";

interface VideoOutcome {
  videoId: string;
  youtubeVideoId: string;
  title: string;
  url: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "FAILED";
  text?: string;
  filePath?: string;
  reason?: string;
}
interface ChannelVideo { youtubeVideoId: string; title: string; url: string; publishedAt?: string; transcriptStatus: string; }
type ResolveResult =
  | { type: "video"; channel: { id: string; name: string }; video: VideoOutcome }
  | { type: "channel"; channel: { id: string; name: string; youtubeChannelId: string }; videos: ChannelVideo[] };

function formatDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "¡Copiado!" : "Copiar ruta"}
      aria-label="Copiar ruta"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", padding: 2, marginLeft: 6, verticalAlign: "middle", color: copied ? "#16a34a" : "#667085" }}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      )}
    </button>
  );
}

export function YouTubeExtractor() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedOutcomes, setSelectedOutcomes] = useState<VideoOutcome[]>([]);
  const [fetchingSelected, setFetchingSelected] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleResolve(event: FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected(new Set());
    setSelectedOutcomes([]);
    setProgress(null);
    try {
      const response = await fetch("/api/youtube/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo procesar la URL");
      setResult(data as ResolveResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  function toggle(youtubeVideoId: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(youtubeVideoId)) next.delete(youtubeVideoId);
      else next.add(youtubeVideoId);
      return next;
    });
  }

  function toggleAll(videos: ChannelVideo[]) {
    const pending = videos.filter((video) => video.transcriptStatus !== "COMPLETED");
    setSelected((previous) => (pending.every((video) => previous.has(video.youtubeVideoId)) && previous.size === pending.length ? new Set() : new Set(pending.map((video) => video.youtubeVideoId))));
  }

  async function handleFetchSelected() {
    if (!selected.size) return;
    setFetchingSelected(true);
    setError(null);
    const ids = [...selected];
    setProgress({ done: 0, total: ids.length });
    setSelectedOutcomes([]);
    const outcomes: VideoOutcome[] = [];
    try {
      for (const youtubeVideoId of ids) {
        const response = await fetch("/api/youtube/transcript", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ youtubeVideoIds: [youtubeVideoId] }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudieron obtener las transcripciones");
        outcomes.push(...(data.videos as VideoOutcome[]));
        setSelectedOutcomes([...outcomes]);
        setProgress({ done: outcomes.length, total: ids.length });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setFetchingSelected(false);
    }
  }

  return (
    <section className="card" style={{ marginBottom: 24 }}>
      <form onSubmit={handleResolve} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="field"
          type="text"
          placeholder="Pegá la URL de un video o de un canal de YouTube"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required
        />
        <button className="button" type="submit" disabled={loading}>{loading ? "Procesando..." : "Analizar"}</button>
      </form>

      {error && <p style={{ color: "#c0362c" }}>{error}</p>}

      {result?.type === "video" && (
        <div style={{ marginTop: 16 }}>
          <p><strong>{result.video.title}</strong> <span className="muted">— {result.channel.name}</span></p>
          {result.video.status === "AVAILABLE" ? (
            <p className="muted">Transcripción guardada en <code>{result.video.filePath}</code><CopyButton text={result.video.filePath ?? ""} /></p>
          ) : (
            <p className="muted">No se pudo obtener la transcripción: {result.video.reason}</p>
          )}
        </div>
      )}

      {result?.type === "channel" && (
        <div style={{ marginTop: 16 }}>
          <p>
            <strong>{result.channel.name}</strong>{" "}
            <span className="muted">— hay {result.videos.length} video{result.videos.length === 1 ? "" : "s"}</span>
          </p>
          {result.videos.length === 0 ? (
            <p className="muted">No se encontraron videos para este canal.</p>
          ) : (
            <>
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={result.videos.some((video) => video.transcriptStatus !== "COMPLETED") && result.videos.filter((video) => video.transcriptStatus !== "COMPLETED").every((video) => selected.has(video.youtubeVideoId))}
                  onChange={() => toggleAll(result.videos)}
                />
                <span className="muted">Seleccionar pendientes</span>
              </label>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {result.videos.map((video) => (
                  <li key={video.youtubeVideoId}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={selected.has(video.youtubeVideoId)} onChange={() => toggle(video.youtubeVideoId)} />
                      <span>{video.title}</span>
                      {formatDate(video.publishedAt) && <span className="muted" style={{ whiteSpace: "nowrap" }}>— {formatDate(video.publishedAt)}</span>}
                      {video.transcriptStatus === "COMPLETED" && <span className="muted" style={{ whiteSpace: "nowrap", color: "#16a34a" }}>✓ Ya extraída</span>}
                    </label>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: 12 }}>
                <button className="button" type="button" disabled={!selected.size || fetchingSelected} onClick={handleFetchSelected}>
                  {fetchingSelected && progress ? `Extrayendo ${progress.done}/${progress.total}...` : `Traer transcripción (${selected.size})`}
                </button>
              </p>
            </>
          )}
          {selectedOutcomes.length > 0 && (
            <ul style={{ marginTop: 8, listStyle: "none", padding: 0, display: "grid", gap: 4 }}>
              {selectedOutcomes.map((video) => (
                <li key={video.youtubeVideoId} className="muted">
                  {video.title}: {video.status === "AVAILABLE" ? <>guardada en <code>{video.filePath}</code><CopyButton text={video.filePath ?? ""} /></> : `sin transcripción (${video.reason})`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
