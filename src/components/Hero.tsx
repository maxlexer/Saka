import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative flex min-h-[max(640px,calc(100svh-4.5rem))] flex-col items-center justify-center px-5 py-10 text-center">
      <div data-intro-hide className="flex flex-col items-center">
        <p className="eyebrow">Parfum</p>
        <h1 id="hero-title" className="h1 mt-4 max-w-[18ch] text-balance lg:max-w-[28ch]">Find the scent that feels like you.</h1>
        <p className="mt-4 max-w-[40ch] text-muted">Fragrance in 10ml, 20ml and 50ml bottles, from our shop in Cambodia.</p>
      </div>
      <Image
        data-hero-bottle
        src="/turntable/frame-00.webp"
        alt="A SAKA Parfum bottle, front view"
        width={720}
        height={960}
        priority
        sizes="(min-width: 1024px) 420px, 60vw"
        className="my-8 h-[40svh] w-auto lg:h-[50svh]"
      />
      <div data-intro-hide className="flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn btn-primary">Shop fragrances</Link>
      </div>
    </section>
  );
}
