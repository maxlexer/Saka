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

      <div className="wrap relative z-10 flex h-full flex-col items-start justify-between pb-12 pt-14 lg:justify-center lg:gap-10 lg:py-0">
        <h1 id="hero-title" data-intro-hide data-mist-text className="h1 max-w-[16ch] text-balance lg:max-w-[20ch]">
          Find the scent that feels like you.
        </h1>
        <div data-intro-hide>
          <Link href="/products" className="btn btn-primary">
            View products <ArrowIcon width={18} height={18} />
          </Link>
        </div>
      </div>

      {/* Centered by layout: on desktop the box spans 32 to 100 percent, so the bottle stands at 66 percent. */}
      <div className="absolute inset-x-0 bottom-[13%] z-[1] flex h-[44%] justify-center lg:bottom-[11%] lg:left-[32%] lg:h-[58%]">
        <div data-hero-bottle className="aspect-[4/5] h-full">
          <SpinBottle dir="/hero" alt="A SAKA Parfum bottle standing on a stone floor" priority skeleton={false} className="h-full" />
        </div>
      </div>

      <MistLayer />
    </section>
  );
}
