"use client";

import { useEffect, useRef, useState } from "react";
import type { RingCard } from "../../content/about";
import { mountRing } from "./ring";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const pad = (n: number) => String(n).padStart(2, "0");

export function PhotoRing({ cards, label, kind }: { cards: readonly RingCard[]; label: string; kind: "project" | "photo" }) {
  const root = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [video, setVideo] = useState<string | null>(null);
  useEffect(() => {
    if (!root.current) return;
    try { return mountRing(root.current, index => { setCurrent(index); setVideo(null); }, () => setVideo(null)); } catch { /* Retain the readable server-rendered gallery if an optional API fails. */ }
  }, []);
  const front = cards[current];
  return <div ref={root} className="photo-ring" role="region" aria-roledescription="carousel" aria-label={label}>
    <div className="ring-stage" tabIndex={0} aria-label={`${label}. Drag, or use the left and right arrow keys, to turn the ring.`}>
      <div className="ring-track">
        {cards.map((card, index) => <div className={`ring-card${card.dark ? " ring-card--dark" : ""}`} key={card.title} data-no={`Nº ${pad(index + 1)}`}>
          {card.image && /* The supplied screenshots must retain their native aspect and resolution. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${basePath}/about/${card.image.file}`} width={card.image.width} height={card.image.height} alt={card.image.alt} draggable={false} loading="lazy" style={{ maxWidth: `min(100%, ${card.image.width * 1.35}px)` }} />}
          {card.video && (video === card.video && current === index
            ? <iframe src={`https://www.youtube-nocookie.com/embed/${card.video}?autoplay=1`} title="Veritas demo video" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            : <a className="ring-poster" href={`https://youtu.be/${card.video}`} target="_blank" rel="noopener noreferrer" aria-label="Watch the Veritas demo video on YouTube"
              onClick={event => { if (root.current?.dataset.ringReady && current === index) { event.preventDefault(); setVideo(card.video!); } }}>
              <span className="ring-play" aria-hidden="true">▶</span><span className="ring-poster-title">Veritas</span><span className="ring-poster-sub">Demo video · YouTube</span>
            </a>)}
        </div>)}
        <div className="ring-orbit" aria-hidden="true" />
      </div>
    </div>
    <div className="ring-bar">
      <button className="ring-nav" type="button" data-dir="-1" aria-label={`Previous ${kind}`}>←</button>
      <p className="ring-caption" aria-live="polite" aria-atomic="true"><span className="ring-count">{pad(current + 1)} / {pad(cards.length)}</span><span className="ring-text">{front.caption}</span>
        {front.link && <a className="ring-link" href={front.link.href} target="_blank" rel="noopener noreferrer">{front.link.label} ↗</a>}
      </p>
      <button className="ring-nav" type="button" data-dir="1" aria-label={`Next ${kind}`}>→</button>
    </div>
    <div className="ring-dots">{cards.map((card, index) => <button className="ring-dot" type="button" key={card.title} data-index={index} aria-label={`Show ${kind} ${index + 1}: ${card.title}`} aria-current={index === current ? "true" : "false"} />)}</div>
    <p className="ring-hint" aria-hidden="true">Drag to turn</p>
    <ul className="ring-fallback">{cards.slice(1).map(card => <li key={card.title}>{card.caption}{card.link && <> · <a href={card.link.href} target="_blank" rel="noopener noreferrer">{card.link.label} ↗</a></>}{card.video && <> · <a href={`https://youtu.be/${card.video}`} target="_blank" rel="noopener noreferrer">Watch the Veritas demo video</a></>}</li>)}</ul>
  </div>;
}
