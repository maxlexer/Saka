import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap flex flex-col items-center text-center">
        <p className="eyebrow">404</p>
        <h1 className="h1 mt-4 max-w-[20ch]">This page is not on our shelf.</h1>
        <p className="mt-4 text-muted">Let us take you back to the scents.</p>
        <Link href="/" className="btn btn-primary mt-8">Back home</Link>
      </div>
    </section>
  );
}
