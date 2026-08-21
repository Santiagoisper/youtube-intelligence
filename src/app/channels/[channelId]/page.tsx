import Link from "next/link";
import { fixtureChannels, fixtureVideos } from "@/lib/fixtures";
export default async function ChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  const channel = fixtureChannels.find(item => item.id === channelId) ?? fixtureChannels[0];
  return <main className="shell"><Link href="/channels" className="muted">← Canales</Link><p className="eyebrow">Channel knowledge base</p><h1>{channel.name}</h1><p className="muted">{channel.description}</p><nav className="tabs"><Link href={`/channels/${channelId}`}>Videos</Link><Link href={`/channels/${channelId}/knowledge`}>Knowledge</Link><Link href={`/channels/${channelId}/stack`}>Stack</Link><Link href={`/channels/${channelId}/changes`}>Changes</Link></nav><section className="grid">{fixtureVideos.map(video => <article className="card" key={video.id}><h2>{video.title}</h2><p className="muted">{video.publishedAt} · {video.status}</p></article>)}</section></main>;
}