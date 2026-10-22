import { CheckoutSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="skeleton mx-auto h-8 w-48 lg:h-10" />
        <CheckoutSkeleton />
      </div>
    </section>
  );
}
