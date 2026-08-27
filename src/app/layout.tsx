import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteFooter, SiteHeader } from "@/components/site-header";
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
    default: "Italia Elect — Simulatore elettorale italiano",
    template: "%s · Italia Elect",
  },
  description:
    "Simulatore statistico delle elezioni nazionali italiane. Dati storici, profilo candidato, Monte Carlo e intervalli di confidenza. Non è una previsione certa.",
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
    <html lang="it" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
