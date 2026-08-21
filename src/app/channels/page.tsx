import Link from "next/link";
import { fixtureChannels } from "@/lib/fixtures";
import { YouTubeExtractor } from "./YouTubeExtractor";
export default function ChannelsPage() {
  return <main className="shell"><p className="eyebrow">Channels</p><h1>Canales</h1><p className="muted">Pegá la URL de un video o de un canal de YouTube para extraer la transcripción.</p><YouTubeExtractor /><section className="grid">{fixtureChannels.map(channel => <Link className="card" href={`/channels/${channel.id}`} key={channel.id}><h2>{channel.name}</h2><p className="muted">{channel.handle} · {channel.videoCount} videos</p><p>{channel.description}</p></Link>)}</section></main>;
}