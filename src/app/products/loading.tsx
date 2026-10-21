import { ProductGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="mx-auto skeleton h-4 w-24" aria-hidden="true" />
        <div className="mx-auto mt-3 skeleton h-10 w-72 max-w-full" aria-hidden="true" />
        <div className="skeleton mt-14 h-8 w-32 lg:mt-20" aria-hidden="true" />
        <ProductGridSkeleton count={3} className="mt-8" />
      </div>
    </section>
  );
}
