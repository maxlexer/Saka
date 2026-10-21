import type { Metadata } from "next";
import { Jost, Montserrat } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { EMPTY_CATALOG, getCatalog, toCartCatalog } from "@/lib/catalog";
import { HEAD_SCRIPT } from "@/lib/head-script";
import { SITE_URL } from "@/lib/jsonld";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-montserrat", display: "swap" });
const jost = Jost({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jost", display: "swap" });

const title = "SAKA Parfum | Fragrance shop in Cambodia";
const description = "Designer fragrance from SAKA Parfum, a perfume shop in Cambodia. Find a scent by mood or occasion.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s | SAKA Parfum" },
  description,
  openGraph: { type: "website", siteName: "SAKA Parfum", title, description, images: [{ url: "/og.png", width: 1200, height: 630, alt: "SAKA Parfum" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cached pages throw on a failed read and keep their last good copy. Only uncached pages fall back here.
  const catalog = await getCatalog().catch(() => EMPTY_CATALOG);
  return (
    <html lang="en" className={`${montserrat.variable} ${jost.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        <Header catalog={toCartCatalog(catalog)} />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
