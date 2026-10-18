import { CheckoutSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="skeleton mx-auto h-[18px] w-24" />
        <div className="skeleton mx-auto mt-3 h-8 w-64 lg:h-10" />
        <CheckoutSkeleton />
      </div>
    </section>
  );
}
