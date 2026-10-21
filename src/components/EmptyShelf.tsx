import Link from "next/link";

export function EmptyShelf() {
  return (
    <p className="mx-auto mt-10 max-w-[62ch] text-center text-muted">
      Our shelves are being restocked. <Link href="/#visit" className="link text-text">Visit us</Link> or message us for what is new.
    </p>
  );
}
