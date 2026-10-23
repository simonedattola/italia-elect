import { SiteFooter, SiteHeader } from "@/components/site/chrome";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell flex min-h-screen flex-col">
      <a className="skip-link" href="#contenuto">
        Vai al contenuto
      </a>
      <SiteHeader />
      <main id="contenuto" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
