import Image from "next/image";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const portraitWidths = [480, 800, 1280, 1920];
const cutoutWidths = [480, 800, 1086];

export function TrailheadPhoto({ climb = false }: { climb?: boolean }) {
  // Pre-sized static assets work on Pages without an image optimization server.
  // The picture source selects the download even before React hydrates.
  const filename = climb ? "dm" : "dm-cutout";
  const sources = (climb ? portraitWidths : cutoutWidths)
    .map((width) => `${basePath}/photos/${filename}-${width}.webp ${width}w`).join(", ");
  const sizes = climb
    ? "(max-width: 900px) 192px, min(384px, 28vw)"
    : "(max-width: 900px) 100vw, 48vw";
  return <picture>
    <source type="image/webp" srcSet={sources} sizes={sizes} />
    <Image className="trailhead-photo" src={`${basePath}/photos/${filename}-480.webp`}
      width={480} height={640} alt="Diego Martinez" loading="eager" />
  </picture>;
}
