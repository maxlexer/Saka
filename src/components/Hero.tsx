import { getImageProps } from "next/image";
import Link from "next/link";
import { ArrowIcon } from "./Icons";
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

const FLOOR = "-z-10 object-cover object-[50%_70%]";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate h-[max(600px,calc(100svh-4.5rem))] touch-pan-y touch-pinch-zoom overflow-hidden">
      <img {...floor("light")} className={FLOOR} />
      {/* Hidden in light mode, so it only downloads once dark is chosen. */}
      <img {...floor("dark")} className={`floor-dark hidden opacity-0 dark:block dark:opacity-100 ${FLOOR}`} />

      {/* No z-index on the column itself: text sits above the mist (z-5), the bottle below it (z-1). */}
      <div className="wrap flex h-full flex-col items-start pb-12 pt-14 lg:justify-center lg:gap-10 lg:py-0">
        <h1 id="hero-title" data-intro-hide data-mist-text className="h1 relative z-10 max-w-[16ch] text-balance lg:max-w-[20ch]">
          Find the scent that feels like you.
        </h1>

        {/* The bottle is the hero. On phones it fills every pixel between headline and button, overflowing into the
            transparent margin of its own image. On desktop the box spans 32 to 100 percent, so it stands at 66 percent. */}
        <div className="relative z-[1] my-4 flex min-h-0 w-full flex-1 justify-center lg:absolute lg:bottom-[1%] lg:left-[32%] lg:right-0 lg:my-0 lg:h-[96%] lg:w-auto lg:flex-none">
          <div data-hero-bottle className="absolute bottom-0 aspect-[4/5] h-[112%] lg:h-full">
            <SpinBottle dir="/hero" alt="A SAKA Parfum bottle standing on a stone floor" priority skeleton={false} className="h-full" />
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
