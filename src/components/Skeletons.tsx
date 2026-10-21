export function ProductCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-4 lg:p-6" aria-hidden="true">
      <div className="skeleton aspect-[4/5] rounded-sm bg-bg" />
      <div className="skeleton mx-auto mt-4 h-4 w-3/4" />
      <div className="skeleton mx-auto mt-2 h-4 w-1/2" />
    </div>
  );
}

export function ProductGridSkeleton({ count, className = "" }: { count: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading products" className={`grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div role="status" aria-label="Loading checkout" className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}>
            <div className="skeleton mb-2 h-[18px] w-32" />
            <div className="skeleton h-11" />
          </div>
        ))}
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-11 w-full lg:w-48" />
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}

export function PaymentSkeleton() {
  return (
    <section className="section">
      <div className="wrap max-w-[520px] text-center" role="status" aria-label="Loading your payment">
        <div className="skeleton mx-auto h-[18px] w-28" />
        <div className="skeleton mx-auto mt-3 h-8 w-40 lg:h-10" />
        <div className="skeleton mx-auto mt-1 h-5 w-24" />
        <div className="skeleton mx-auto mt-8 aspect-square w-full max-w-[320px]" />
        <div className="skeleton mx-auto mt-6 h-1 w-full max-w-[320px]" />
        <div className="skeleton mx-auto mt-2 h-5 w-36" />
        <div className="skeleton mx-auto mt-4 h-6 w-44" />
      </div>
    </section>
  );
}
