import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { Splash } from "../components/splash/Splash";
import { SPLASH_GATE_SCRIPT } from "../components/splash/gate";
import { professionalDescription, siteUrl } from "../content/site";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import { DEFAULT_THEME, THEME_SCRIPT } from "../components/theme/prepaint";

import "./globals.css";
import "./theme.css";
import "../components/theme/theme.css";
import "../components/splash/splash.css";
import "../components/splash/motion.generated.css";

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
  metadataBase: siteUrl,
  title: "Diego Martinez — Software Engineer",
  description: professionalDescription,
  authors: [{ name: "Diego Martinez" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} className={`${newsreader.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script id="theme-restore" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script id="splash-gate" dangerouslySetInnerHTML={{ __html: SPLASH_GATE_SCRIPT }} />
      </head>
      <body>
        <Splash />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
