export function CheckoutSkeleton() {
  return (
    <div role="status" aria-label="Loading checkout" className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
      <div className="skeleton h-64 rounded-card lg:col-start-2 lg:row-start-1" />
      <div className="space-y-6 lg:col-start-1 lg:row-start-1">
        <div className="skeleton h-6 w-40 lg:h-7" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}>
            <div className="skeleton mb-2 h-[18px] w-32" />
            <div className="skeleton h-11" />
          </div>
        ))}
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-11 w-full lg:w-72" />
      </div>
    </div>
  );
}

export function PaymentSkeleton() {
  return (
    <section className="section linen">
      <div className="wrap max-w-[520px] text-center" role="status" aria-label="Loading your payment">
        <div className="rounded-card border border-border bg-bg px-6 pb-6 pt-8 sm:px-8">
          <div className="skeleton mx-auto h-5 w-24" />
          <div className="skeleton mx-auto mt-6 h-8 w-48 lg:h-10" />
          <div className="skeleton mx-auto mt-6 aspect-square w-full max-w-[280px]" />
          <div className="skeleton mx-auto mt-3 h-5 w-40" />
          <div className="skeleton mx-auto mt-6 h-1 w-full max-w-[320px]" />
          <div className="skeleton mx-auto mt-2 h-5 w-36" />
          <div className="skeleton mx-auto mt-4 h-6 w-44" />
          <div className="mt-8 space-y-2 border-t border-dashed border-border pt-5">
            <div className="skeleton h-5" />
            <div className="skeleton h-5" />
          </div>
        </div>
      </div>
    </section>
  );
}
