"use client";

export default function ProductsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="section">
      <div className="container text-center">
        <h1 className="h2">We could not load our shelf just now</h1>
        <p className="mt-4 text-muted">Please try again in a moment.</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-8">Try again</button>
      </div>
    </section>
  );
}
