import { PrismaChannelIndexStore } from "@/services/youtube/prismaStore";
import { YouTubeExtractor } from "./YouTubeExtractor";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ChannelsPage() {
  let channels: Awaited<ReturnType<PrismaChannelIndexStore["listChannels"]>> = [];
  let dbUnavailable = false;
  try {
    channels = await new PrismaChannelIndexStore().listChannels();
  } catch {
    dbUnavailable = true;
  }
  return (
    <main className="shell">
      <p className="eyebrow">Channels</p>
      <h1>Canales</h1>
      <p className="muted">Pegá la URL de un video o de un canal de YouTube para extraer la transcripción.</p>
      <YouTubeExtractor />
      {dbUnavailable ? (
        <p className="muted">No se pudo conectar a la base de datos para listar canales.</p>
      ) : channels.length === 0 ? (
        <p className="muted">Todavía no analizaste ningún canal.</p>
      ) : (
        <section className="grid">
          {channels.map((channel) => (
            <div className="card" key={channel.id}>
              <h2>{channel.name}</h2>
              <p className="muted">
                {channel.handle ? `${channel.handle} · ` : ""}
                {channel.videoCount} video{channel.videoCount === 1 ? "" : "s"}
              </p>
              {formatDate(channel.lastIndexedAt) && <p className="muted">Última actividad: {formatDate(channel.lastIndexedAt)}</p>}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
