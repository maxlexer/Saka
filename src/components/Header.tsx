import Link from "next/link";
import type { CartCatalog } from "@/lib/catalog";
import { STORE } from "@/lib/store";
import { CartMenu } from "./CartMenu";
import { PinIcon } from "./Icons";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NAV } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ catalog }: { catalog: CartCatalog }) {
  return (
    <header data-intro-hide className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 lg:h-[72px] lg:px-8">
        <Link href="/" aria-label="SAKA Parfum, home" className="flex h-11 items-center">
          <Logo showParfum={false} className="h-5 w-auto lg:h-6" />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="link tap label">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center">
          {/* The name starts with the visible city, so voice users can say what they see. Phones show the pin alone. */}
          <a href={STORE.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`${STORE.city}, open in Google Maps`} className="flex h-11 min-w-11 items-center justify-center gap-2 lg:mr-3">
            <PinIcon />
            <span className="link label hidden lg:inline">{STORE.city}</span>
          </a>
          <ThemeToggle />
          <CartMenu catalog={catalog} />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
