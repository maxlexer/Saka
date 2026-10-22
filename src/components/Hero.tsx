import { getImageProps } from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { FLOOR_VARS } from "@/lib/mist-math";
import { STORE } from "@/lib/store";
import { ArrowIcon, PinIcon } from "./Icons";
import { MistLayer } from "./MistLayer";
import { SpinBottle } from "./SpinBottle";

// Optimized srcsets rendered on the server as plain img tags, so no image component ships to the browser.
const floor = (theme: "light" | "dark") =>
  getImageProps({
    src: `/hero/floor-${theme}.webp`,
    alt: "",
    fill: true,
    sizes: "100vw",
    ...(theme === "light" ? { loading: "eager", fetchPriority: "high" } : { loading: "lazy" }),
  }).props;

// Top-aligned and lifted on wide screens (FLOOR_VARS), so the horizon never drops below 75 percent of the hero.
const FLOOR = "-z-10 object-cover object-[50%_var(--lift)]";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      style={FLOOR_VARS as CSSProperties}
      className="relative isolate h-[max(600px,calc(100svh-4.5rem))] touch-pan-y touch-pinch-zoom overflow-hidden [container-type:size]"
    >
      <img {...floor("light")} className={FLOOR} />
      {/* Hidden in light mode, so it only downloads once dark is chosen. */}
      <img {...floor("dark")} className={`floor-dark hidden opacity-0 dark:block dark:opacity-100 ${FLOOR}`} />

      {/* No z-index on the column itself: text sits above the mist (z-5), the bottle below it (z-1). */}
      <div className="wrap flex h-full flex-col items-start pb-12 pt-14 lg:justify-center lg:gap-10 lg:py-0">
        <div data-intro-hide data-mist-text className="relative z-10">
          {/* The name starts with the visible city, so voice users can say what they see. */}
          <a href={STORE.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`${STORE.city}, open in Google Maps`} className="eyebrow -mt-3 mb-1 flex h-11 w-fit items-center gap-2">
            <PinIcon width={18} height={18} />
            <span className="link">{STORE.city}</span>
          </a>
          <h1 id="hero-title" className="h1 max-w-[16ch] text-balance lg:max-w-[20ch]">
            Find the scent that feels like you.
          </h1>
        </div>

        {/* The bottle is the hero. On phones it fills every pixel between headline and button, overflowing into the
            transparent margin of its own image. On desktop the box spans 32 to 100 percent, so it stands at 66 percent
            (68 on narrow desktops, sized by width too, so it clears the headline). Its base, 16 percent up the box, stands
            45 percent of the way down the floor band, whatever the screen shape. */}
        <div className="relative z-[1] my-4 flex min-h-0 w-full flex-1 justify-center lg:absolute lg:bottom-[calc(0.55*(100cqh-var(--horizon))-0.16*var(--bottle-h))] lg:left-[36%] lg:right-0 lg:my-0 lg:h-(--bottle-h) lg:w-auto lg:flex-none lg:[--bottle-h:min(96cqh,60cqw)] xl:left-[32%]">
          <div data-hero-bottle className="absolute bottom-0 aspect-[4/5] h-[112%] lg:h-full">
            <SpinBottle dir="/hero" alt="A SAKA Parfum bottle standing on a stone floor" priority skeleton={false} grounded className="h-full" />
          </div>
        </div>

        <div data-intro-hide className="relative z-10">
          <Link href="/products" className="btn btn-primary">
            View products <ArrowIcon width={18} height={18} />
          </Link>
        </div>
      </div>

      <MistLayer />
    </section>
  );
}
