"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/catalog";
import { EMPTY_SELECTION, findMatches, isEmptySelection, parseSelection, selectionToQuery, toggle, type Selection } from "@/lib/finder";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";
import { LABELS, OCCASIONS, SCENT_FAMILIES, VIBE_LABELS, VIBES } from "@/lib/taxonomy";
import { ProductGrid } from "./ProductGrid";

/** One question shows at a time, so the visitor faces six choices at most instead of fifteen. */
const GROUPS = [
  { key: "vibes", title: "Vibe", values: VIBES, labels: VIBE_LABELS as Record<string, string> },
  { key: "occasions", title: "Occasion", values: OCCASIONS, labels: LABELS },
  { key: "families", title: "Scent family", values: SCENT_FAMILIES, labels: LABELS },
] as const;

/** Cards sit on cream inside the surface band, so they read as tiles rather than melting into it. */
const GRID = "[&_a]:bg-bg";

export function Finder({ products }: { products: Product[] }) {
  const [sel, setSel] = useState<Selection>(EMPTY_SELECTION);
  const [tab, setTab] = useState(0);
  const results = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLParagraphElement>(null);

  useEffect(() => setSel(parseSelection(new URLSearchParams(window.location.search))), []);

  const change = (next: Selection) => {
    setSel(next);
    window.history.replaceState(null, "", `${window.location.pathname}${selectionToQuery(next, window.location.search)}${window.location.hash}`);
    // On a phone the count and results sit below the chips: bring the count up once it would land under the fold.
    requestAnimationFrame(() => {
      if (status.current!.getBoundingClientRect().bottom > innerHeight - 96) status.current!.scrollIntoView({ block: "center" });
    });
  };
  const group = GROUPS[tab];

  const { matches, close } = findMatches(products, sel);
  const empty = isEmptySelection(sel);
  const shown = [...matches, ...close].map((p) => p.id).join();

  // Each new result set fades in. Reverting on update cancels a fade still running from a quick earlier toggle.
  useGSAP(
    () => {
      if (!shown) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(results.current, { opacity: 0 }, { opacity: 1, ...MOTION.enter });
      });
    },
    { dependencies: [shown], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(chips.current, { opacity: 0, y: 6 }, { opacity: 1, y: 0, ...MOTION.enter });
      });
    },
    { dependencies: [tab], revertOnUpdate: true },
  );

  return (
    <div className="wrap text-center">
      <p className="eyebrow">Scent finder</p>
      <h2 id="finder-title" className="h2 mt-3">Tell us how you want to feel</h2>

      <div role="group" aria-label="Choose by" className="mt-10 flex justify-center gap-6 sm:gap-8">
        {GROUPS.map(({ key, title }, i) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === i}
            onClick={() => setTab(i)}
            className="link tap label text-muted transition-colors duration-300 aria-pressed:text-text"
          >
            {title}
            {sel[key].length > 0 && <span className="badge ml-2 inline-grid tracking-normal">{sel[key].length}</span>}
          </button>
        ))}
      </div>
      <div ref={chips} role="group" aria-label={group.title} className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
        {group.values.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={(sel[group.key] as string[]).includes(value)}
            onClick={() => change({ ...sel, [group.key]: toggle(sel[group.key] as string[], value) })}
            className="chip"
          >
            {group.labels[value]}
          </button>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-2">
        <p ref={status} role="status" aria-live="polite" aria-atomic="true" className="text-muted">
          {empty
            ? "Choose what feels right. We will show what is in store."
            : matches.length > 0
              ? `${matches.length} ${matches.length === 1 ? "scent matches" : "scents match"}`
              : "Nothing matches all of that. Try removing one choice."}
        </p>
        {/* Kept in the layout while hidden, so the line above never shifts. */}
        <button
          type="button"
          onClick={() => {
            change(EMPTY_SELECTION);
            // This button hides itself, so focus moves to the first chip instead of falling to the page.
            chips.current?.querySelector("button")?.focus();
          }}
          className={`link tap label ${empty ? "invisible" : ""}`}
        >
          Clear all
        </button>
      </div>

      <div ref={results}>
        {matches.length > 0 && <ProductGrid products={matches} className={`mt-10 ${GRID}`} />}
        {close.length > 0 && (
          <>
            <h3 className="h3 mt-12">Close matches</h3>
            <ProductGrid products={close} className={`mt-8 ${GRID}`} />
          </>
        )}
      </div>
    </div>
  );
}
