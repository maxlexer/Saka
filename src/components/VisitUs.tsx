import { HOURS, PHONE_HREF, STORE } from "@/lib/store";
import { ArrowIcon } from "./Icons";

export function VisitUs() {
  return (
    <section id="visit" aria-labelledby="visit-title" className="section">
      <div className="wrap text-center">
        <h2 id="visit-title" className="h2">Visit the shop</h2>
        <address className="mx-auto mt-6 max-w-[62ch] whitespace-pre-line not-italic">{STORE.address}</address>
        {HOURS.map((line) => <p key={line} className="mt-2 text-muted">{line}</p>)}
        {STORE.phone && <p className="mt-6"><a className="link" href={PHONE_HREF}>{STORE.phone}</a></p>}
        <a href={STORE.mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-8">
          Get directions <ArrowIcon width={18} height={18} />
        </a>
      </div>
    </section>
  );
}
