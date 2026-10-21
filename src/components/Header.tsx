import Link from "next/link";
import type { CartCatalog } from "@/lib/catalog";
import { CartMenu } from "./CartMenu";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NAV } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ catalog }: { catalog: CartCatalog }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 lg:h-[72px] lg:px-8">
        <Link href="/" aria-label="SAKA Parfum, home">
          <Logo showParfum={false} className="h-5 w-auto lg:h-6" />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="link tap font-display text-[13px] font-medium uppercase tracking-[0.16em]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center">
          <ThemeToggle />
          <CartMenu catalog={catalog} />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
