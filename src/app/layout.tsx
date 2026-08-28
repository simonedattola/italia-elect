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

export const metadata: Metadata = {
  title: {
    default: "Italia Elect Game — Simulazione politica",
    template: "%s · Italia Elect Game",
  },
  description:
    "Gioco politico italiano: multiplayer, single player e sfida vs computer con simulazione realistica.",
  keywords: [
    "elezioni italiane",
    "simulatore elettorale",
    "politica italiana",
    "Monte Carlo",
    "Italia Elect",
  ],
  openGraph: {
    title: "Italia Elect",
    description:
      "Simula il risultato di un'elezione nazionale italiana con un modello statistico trasparente.",
    locale: "it_IT",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Providers>
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
