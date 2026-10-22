import { PHONE_HREF, STORE, TELEGRAM_HREF } from "@/lib/store";

/** Same words in the same place on checkout and every payment state, so help is always where people look for it. */
export function ShopContact({ className = "" }: { className?: string }) {
  return (
    <p className={`small text-muted ${className}`}>
      Questions? Call <a className="link text-text" href={PHONE_HREF}>{STORE.phone}</a> or message us on{" "}
      <a className="link text-text" href={TELEGRAM_HREF} target="_blank" rel="noopener noreferrer">Telegram</a>.
    </p>
  );
}
