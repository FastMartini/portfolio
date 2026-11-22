"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { teachingPhotos } from "../../content/about";
import { mountTeachingCarousel } from "./teaching-carousel";
import type { TeachingCarouselController } from "./teaching-carousel";
import "./teaching-carousel.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function TeachingCarousel() {
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const controller = useRef<TeachingCarouselController | null>(null);
  const selected = useRef<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  const dismiss = useCallback(() => {
    const index = selected.current;
    selected.current = null;
    if (dialog.current?.open) dialog.current.close();
    if (index !== null) controller.current?.closePreview(index);
    setPreview(null);
  }, []);

  useEffect(() => {
    if (!root.current || typeof HTMLDialogElement === "undefined") return;
    const mounted = mountTeachingCarousel(root.current, index => { selected.current = index; setPreview(index); }, dismiss);
    controller.current = mounted;
    return () => { mounted.dispose(); controller.current = null; };
  }, [dismiss]);

  useEffect(() => {
    const modal = dialog.current;
    if (preview === null || !modal) return;
    modal.showModal();
    closeButton.current?.focus({ preventScroll: true });
    // Keep the page (and the Climb behind it) still without overflow: hidden on
    // <html>, which would stop the sticky mountain stage from painting.
    const stuck = () => modal.scrollHeight <= modal.clientHeight + 1;
    const block = (event: Event) => { if (stuck()) event.preventDefault(); };
    const keys = (event: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) return;
      if (event.target instanceof Element && event.target.closest("button, a")) return;
      block(event);
    };
    const listen = { passive: false } as const;
    modal.addEventListener("wheel", block, listen);
    modal.addEventListener("touchmove", block, listen);
    modal.addEventListener("keydown", keys);
    return () => {
      modal.removeEventListener("wheel", block);
      modal.removeEventListener("touchmove", block);
      modal.removeEventListener("keydown", keys);
      if (modal.open) modal.close();
    };
  }, [preview]);

  const photo = preview === null ? null : teachingPhotos[preview];
  return <div className="teaching-gallery" ref={root} role="region" aria-roledescription="carousel" aria-label="Accomplishments">
    <div className="teaching-gallery-heading">
      <h3>Accomplishments</h3>
    </div>
    <p className="teaching-gallery-hint" id="teaching-gallery-hint">Drag or swipe to browse. Select a photo to enlarge.</p>
    <div className="teaching-gallery-viewport" role="group" tabIndex={0} aria-label="Accomplishment photos. Use left and right arrow keys to browse." aria-describedby="teaching-gallery-hint">
      <div className="teaching-gallery-track">
        {[0, 1, 2].map(copy => <div className="teaching-gallery-copy" data-copy={copy} aria-hidden={copy !== 1 ? true : undefined} key={copy}>
          {teachingPhotos.map((item, index) => <a className="teaching-photo" href={`${basePath}/about/${item.image.file}`} data-photo-index={index} key={item.image.file}
            aria-label={`Enlarge ${item.title}`} tabIndex={copy === 1 ? 0 : -1} draggable={false}>
            {/* Full-size source photos are shared with the About gallery. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${basePath}/about/${item.image.file}`} width={item.image.width} height={item.image.height} alt={item.image.alt} draggable={false} loading="lazy" />
            <span className="teaching-photo-caption">{item.caption}</span>
          </a>)}
        </div>)}
      </div>
    </div>
    <dialog ref={dialog} className="teaching-preview" data-theme-root="" aria-label={photo ? `${photo.title}, enlarged` : "Enlarged teaching photo"}
      onClose={() => { if (!dialog.current?.open) dismiss(); }} onCancel={event => { event.preventDefault(); dismiss(); }} onClick={event => {
        if (event.target instanceof Element && !event.target.closest("img, button")) dismiss();
      }}>
      <button ref={closeButton} className="teaching-preview-close" type="button" aria-label="Close enlarged photo" onClick={dismiss}><svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
      {photo && <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${basePath}/about/${photo.image.file}`} width={photo.image.width} height={photo.image.height} alt={photo.image.alt} />
        <figcaption>{photo.caption}</figcaption>
      </figure>}
    </dialog>
  </div>;
}
