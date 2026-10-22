import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap flex flex-col items-center text-center">
        <p className="eyebrow">404</p>
        <h1 className="h1 mt-4 max-w-[20ch]">This page is not on our shelf.</h1>
        <p className="mt-4 text-muted">Let us take you back to the scents.</p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          <Link href="/products" className="btn btn-primary">View products</Link>
          <Link href="/" className="link tap">Back home</Link>
        </div>
      </div>
    </section>
  );
}
