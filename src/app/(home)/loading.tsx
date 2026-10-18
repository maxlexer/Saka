import { ProductGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <div className="flex min-h-[max(640px,calc(100svh-4.5rem))] flex-col items-center justify-center gap-6 px-5" aria-hidden="true">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-12 w-full max-w-md" />
        <div className="skeleton h-[40svh] w-[30svh] lg:h-[50svh] lg:w-[37.5svh]" />
        <div className="skeleton h-11 w-48" />
      </div>
      <section className="section"><div className="container"><ProductGridSkeleton count={6} className="lg:[&>div:nth-child(n+4)]:hidden" /></div></section>
    </>
  );
}
