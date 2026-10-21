"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/catalog";
import { EMPTY_SELECTION, findMatches, isEmptySelection, parseSelection, selectionToQuery, toggle, type Selection } from "@/lib/finder";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";
import { LABELS, OCCASIONS, SCENT_FAMILIES, VIBES } from "@/lib/taxonomy";
import { ProductGrid } from "./ProductGrid";

const GROUPS = [
  { key: "vibes", title: "Vibe", values: VIBES },
  { key: "occasions", title: "Occasion", values: OCCASIONS },
  { key: "families", title: "Scent family", values: SCENT_FAMILIES },
] as const;

/** Cards sit on cream inside the surface band, so they read as tiles rather than melting into it. */
const GRID = "[&_a]:bg-bg";

export function Finder({ products }: { products: Product[] }) {
  const [sel, setSel] = useState<Selection>(EMPTY_SELECTION);
  const results = useRef<HTMLDivElement>(null);

  useEffect(() => setSel(parseSelection(new URLSearchParams(window.location.search))), []);

  const change = (next: Selection) => {
    setSel(next);
    window.history.replaceState(null, "", `${window.location.pathname}${selectionToQuery(next)}${window.location.hash}`);
  };

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

  return (
    <div className="wrap text-center">
      <p className="eyebrow">Scent finder</p>
      <h2 id="finder-title" className="h2 mt-3">Tell us how you want to feel</h2>

      <div className="mx-auto mt-10 max-w-3xl space-y-8">
        {GROUPS.map(({ key, title, values }) => (
          <div key={key} role="group" aria-labelledby={`finder-${key}`}>
            <h3 id={`finder-${key}`} className="eyebrow mb-3">{title}</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {values.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={(sel[key] as string[]).includes(value)}
                  onClick={() => change({ ...sel, [key]: toggle(sel[key] as string[], value) })}
                  className="chip"
                >
                  {LABELS[value]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-2">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-muted">
          {empty
            ? "Choose what feels right. We will show what is in store."
            : matches.length > 0
              ? `${matches.length} ${matches.length === 1 ? "scent matches" : "scents match"}`
              : "Nothing matches all of that. Try removing one choice."}
        </p>
        {/* Kept in the layout while hidden, so the line above never shifts. */}
        <button
          type="button"
          onClick={() => change(EMPTY_SELECTION)}
          className={`link tap font-display text-[13px] font-medium uppercase tracking-[0.16em] ${empty ? "invisible" : ""}`}
        >
          Clear all
        </button>
      </div>

      <div ref={results}>
        {matches.length > 0 && <ProductGrid products={matches} eager={0} className={`mt-10 ${GRID}`} />}
        {close.length > 0 && (
          <>
            <h3 className="h3 mt-12">Close matches</h3>
            <ProductGrid products={close} eager={0} className={`mt-8 ${GRID}`} />
          </>
        )}
      </div>
    </div>
  );
}
