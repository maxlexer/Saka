import { ProductGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <section className="section">
      <div className="container">
        <div className="mx-auto skeleton h-4 w-24" aria-hidden="true" />
        <div className="mx-auto mt-3 skeleton h-10 w-72 max-w-full" aria-hidden="true" />
        <ProductGridSkeleton count={6} className="mt-10 [&>div:nth-child(n+5)]:hidden lg:[&>div:nth-child(n+5)]:block" />
      </div>
    </section>
  );
}
