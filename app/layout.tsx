import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { Splash } from "../components/splash/Splash";
import { SPLASH_GATE_SCRIPT } from "../components/splash/gate";

import "./globals.css";
import "../components/splash/splash.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Diego Martinez — Software Engineer",
  description:
    "Software engineer building intelligent, data-driven products—from research and systems to polished user experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script id="splash-gate" dangerouslySetInnerHTML={{ __html: SPLASH_GATE_SCRIPT }} />
      </head>
      <body>
        <Splash />
        {children}
      </body>
    </html>
  );
}
