import { STORE } from "@/lib/store";
import { ArrowIcon } from "./Icons";

export function VisitUs() {
  return (
    <section id="visit" aria-labelledby="visit-title" className="section">
      <div className="wrap text-center">
        <p className="eyebrow">Visit us</p>
        <h2 id="visit-title" className="h2 mt-3">Visit the shop</h2>
        <address className="mx-auto mt-6 max-w-[62ch] whitespace-pre-line not-italic">{STORE.address}</address>
        {STORE.hours.length > 0 && (
          <dl className="mx-auto mt-6 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-left">
            {STORE.hours.map(({ days, open, close }) => (
              <div key={days} className="contents">
                <dt>{days}</dt>
                <dd className="text-muted">{open} to {close}</dd>
              </div>
            ))}
          </dl>
        )}
        {STORE.phone && <p className="mt-6"><a className="link" href={`tel:${STORE.phone.replace(/\s/g, "")}`}>{STORE.phone}</a></p>}
        <a href={STORE.mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-8">
          Get directions <ArrowIcon width={18} height={18} />
        </a>
      </div>
    </section>
  );
}
