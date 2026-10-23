import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Italia Elect — Archivi e simulazioni elettorali",
    template: "%s · Italia Elect",
  },
  description:
    "Archivio degli scrutini italiani e simulatore con seggi, Monte Carlo e intervalli. Il gioco resta una partita a parte.",
  keywords: [
    "elezioni italiane",
    "simulatore elettorale",
    "Rosatellum",
    "archivio Eligendo",
    "Italia Elect",
  ],
  openGraph: {
    title: "Italia Elect",
    description:
      "Scrutini pubblici dal dopoguerra e scenari elettorali con intervalli, senza inventare i numeri che mancano.",
    locale: "it_IT",
    type: "website",
    siteName: "Italia Elect",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Providers>{children}</Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Italia Elect",
              inLanguage: "it",
              applicationCategory: "EducationalApplication",
              url: appUrl,
              creator: { "@type": "Organization", name: "Vexa Studio", url: "https://vexastudio.it" },
            }),
          }}
        />
      </body>
    </html>
  );
}
