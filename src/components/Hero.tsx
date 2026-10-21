import { getImageProps } from "next/image";
import Link from "next/link";

// Optimized srcset rendered on the server as a plain img, so no image component ships to the browser.
// No explicit preload: the img is high priority in the first HTML, and a server preload hint would also fire
// whenever another page prefetches home.
const { props: bottle } = getImageProps({
  src: "/hero/still.webp",
  alt: "A SAKA Parfum bottle, front view",
  width: 960,
  height: 1200,
  sizes: "(min-width: 1024px) 420px, 60vw",
  loading: "eager",
  fetchPriority: "high",
});

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative flex min-h-[max(640px,calc(100svh-4.5rem))] flex-col items-center justify-center px-5 py-10 text-center">
      <div data-intro-hide className="flex flex-col items-center">
        <p className="eyebrow">Parfum</p>
        <h1 id="hero-title" className="h1 mt-4 max-w-[18ch] text-balance lg:max-w-[28ch]">Find the scent that feels like you.</h1>
      </div>
      <img {...bottle} data-hero-bottle className="my-8 h-[40svh] w-auto lg:h-[50svh]" />
      <div data-intro-hide className="flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn btn-primary">Shop fragrances</Link>
      </div>
    </section>
  );
}
