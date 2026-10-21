import { STORE } from "@/lib/store";
import { socialIcon } from "./Icons";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="wrap flex flex-col items-center gap-6 py-14 text-center">
        <Logo className="h-14 w-auto" />
        <p className="small text-muted">Fragrance from Cambodia.</p>
        <p className="small max-w-[62ch] text-muted">
          {STORE.address}
          {STORE.phone && <> &middot; <a className="link" href={`tel:${STORE.phone.replace(/\s/g, "")}`}>{STORE.phone}</a></>}
        </p>
        {STORE.socialLinks.length > 0 && (
          <ul className="flex gap-2">
            {STORE.socialLinks.map(({ label, url }) => {
              const Icon = socialIcon(label);
              return (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex min-h-11 min-w-11 items-center justify-center text-secondary">
                    {Icon ? <Icon /> : <span className="small">{label}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <p className="small text-muted">&copy; {new Date().getFullYear()} {STORE.name}</p>
      </div>
    </footer>
  );
}
