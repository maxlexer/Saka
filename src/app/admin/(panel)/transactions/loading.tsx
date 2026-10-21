export default function Loading() {
  return (
    <div role="status" aria-label="Loading transactions" className="mt-10">
      <div className="skeleton h-8 w-56" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-32 rounded-[8px]" />
        <div className="skeleton h-32 rounded-[8px]" />
      </div>
      <div className="mt-10 space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-40 rounded-[8px]" />
        ))}
      </div>
    </div>
  );
}
