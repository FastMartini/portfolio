import type { Metadata } from "next";

export const siteName = "Diego Martinez";
export const professionalDescription =
  "Software engineer building intelligent, data-driven products—from research and systems to polished user experiences.";

// Pages supplies its complete public URL, including a project path when present.
// A custom domain supplies its root URL with an empty NEXT_PUBLIC_BASE_PATH.
export const siteUrl = new URL(
  `${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://fastmartini.github.io/portfolio").replace(/\/+$/, "")}/`,
);

export function publicUrl(path: string) {
  return new URL(path.replace(/^\/+/, ""), siteUrl).href;
}

export function pageMetadata({ title, description, path, image, imageAlt }: {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
}) {
  const url = publicUrl(path);
  const socialImage = {
    url: publicUrl(`/social/${image}.png`),
    width: 1200,
    height: 630,
    alt: imageAlt,
    type: "image/png",
  };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName,
      title,
      description,
      url,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  } satisfies Metadata;
}

export const homeMetadata = pageMetadata({
  title: "Diego Martinez — Software Engineer",
  description: professionalDescription,
  path: "/",
  image: "portfolio",
  imageAlt: "Diego Martinez — Software Engineer. An Editorial Alpine mountain ridge on parchment.",
});
