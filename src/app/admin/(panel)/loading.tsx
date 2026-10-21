export default function Loading() {
  return (
    <div role="status" aria-label="Loading admin" className="mt-10">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton mt-8 h-56 rounded-[8px]" />
      <div className="skeleton mt-12 h-6 w-32" />
      {Array.from({ length: 4 }, (_, group) => (
        <div key={group} className="mt-8">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton mt-3 h-48 rounded-[8px]" />
        </div>
      ))}
    </div>
  );
}
