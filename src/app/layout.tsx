import type { Metadata } from "next";
import { Jost, Montserrat } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCatalog, getSettings, toCartCatalog } from "@/lib/sanity";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-montserrat", display: "swap" });
const jost = Jost({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = { title: "SAKA Parfum | Fragrance shop in Cambodia" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [products, settings] = await Promise.all([getCatalog().catch(() => []), getSettings()]);
  return (
    <html lang="en" className={`${montserrat.variable} ${jost.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        <Header catalog={toCartCatalog(products)} />
        <main id="main" className="flex-1">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
