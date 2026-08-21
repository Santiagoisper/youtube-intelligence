import Link from "next/link";
export default function Home() {
  return <main className="shell"><p className="eyebrow">YouTube Intelligence</p><h1>Base de conocimiento técnica acumulativa</h1><p className="muted">Convertí canales de YouTube en conocimiento estructurado, trazable y listo para detectar cambios.</p><Link className="button" href="/channels">Explorar canales</Link></main>;
}