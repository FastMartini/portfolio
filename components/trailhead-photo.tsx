import Image from "next/image";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const portraitWidths = [480, 800, 1280, 1920];
const portraitSources = portraitWidths.map((width) => `${basePath}/photos/dm-${width}.webp ${width}w`).join(", ");

export function TrailheadPhoto({ climb = false }: { climb?: boolean }) {
  // Pre-sized static assets work on Pages without an image optimization server.
  // The picture source selects the download even before React hydrates.
  const sizes = climb
    ? "(max-width: 900px) 192px, min(384px, 28vw)"
    : "(max-width: 900px) min(448px, calc(100vw - 40px)), 40vw";
  return <picture>
    <source type="image/webp" srcSet={portraitSources} sizes={sizes} />
    <Image className="trailhead-photo" src={`${basePath}/photos/dm-480.webp`}
      width={480} height={640} alt="Diego Martinez" loading="eager" />
  </picture>;
}
