"use client";

import Image from "next/image";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product, SizePrices } from "@/lib/catalog";
import { gsap, useGSAP } from "@/lib/gsap";
import { formatUsd } from "@/lib/pricing";
import { MAX_LINE_QTY } from "@/lib/schemas";
import { LABELS, SIZES_ML, type SizeMl } from "@/lib/taxonomy";
import { AlertIcon, CheckIcon, MinusIcon, PlusIcon } from "./Icons";

type Props = { product: Product; prices: SizePrices; open: boolean; onToggle: () => void; priority?: boolean };

export function ProductCard({ product, prices, open, onToggle, priority = false }: Props) {
  const { id, name, description, available, family } = product;
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [sizeMl, setSizeMl] = useState<SizeMl>(10);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<"added" | "full" | null>(null);
  const { add } = useCart();

  useEffect(() => {
    if (status !== "added") return;
    const timer = setTimeout(() => setStatus(null), 1600);
    return () => clearTimeout(timer);
  }, [status]);

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (open) {
          panel.hidden = false;
          gsap.fromTo(panel, { height: 0 }, { height: "auto", duration: 0.4, ease: "power2.out" });
        } else if (!panel.hidden) {
          gsap.to(panel, { height: 0, duration: 0.4, ease: "power2.out", onComplete: () => { panel.hidden = true; } });
        }
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        panel.hidden = !open;
      });
    },
    { dependencies: [open], revertOnUpdate: true },
  );

  const notes = [
    ["Top", product.notesTop],
    ["Heart", product.notesHeart],
    ["Base", product.notesBase],
  ] as const;

  return (
    <article
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          onToggle();
          toggleRef.current?.focus();
        }
      }}
      className="group border border-border bg-surface p-4 transition-colors duration-[400ms] ease-out hover:border-secondary md:p-6"
    >
      <button ref={toggleRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle} className="block w-full text-center">
        <span className="relative block aspect-square overflow-hidden bg-bg">
          <Image
            src="/turntable/frame-00.webp"
            alt={`${name} bottle, placeholder image`}
            fill
            sizes="(min-width: 1024px) 360px, 50vw"
            priority={priority}
            className="object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
          />
        </span>
        <span className="h3 mt-5 block">{name}</span>
        <span className="small mt-2 block">
          {SIZES_ML.map((size, i) => (
            <Fragment key={size}>
              {i > 0 && " · "}
              <span className="whitespace-nowrap">{size}ml {formatUsd(prices[size], true)}</span>
            </Fragment>
          ))}
        </span>
        <span className={`small mt-2 inline-flex items-center gap-1 ${available ? "text-success" : "text-error"}`}>
          {available ? <CheckIcon width={18} height={18} /> : <AlertIcon width={18} height={18} />}
          {available ? "Available" : "Out of stock"}
        </span>
        <span className="mt-2 flex justify-center text-secondary">{open ? <MinusIcon /> : <PlusIcon />}</span>
      </button>

      <div id={panelId} ref={panelRef} role="region" aria-label={`${name} details`} hidden className="overflow-hidden">
        <div className="space-y-5 pt-6 text-left">
          <dl className="grid grid-cols-[4rem_1fr] gap-x-3 gap-y-2">
            {notes.map(([label, list]) =>
              list.length > 0 ? (
                <Fragment key={label}>
                  <dt className="eyebrow">{label}</dt>
                  <dd className="small">{list.join(", ")}</dd>
                </Fragment>
              ) : null,
            )}
          </dl>
          <p className="small">{description}</p>
          <p className="w-fit rounded-sm bg-badge px-2 py-0.5 font-display text-[11px] font-medium uppercase tracking-[0.12em] text-ink">{LABELS[family]}</p>

          <fieldset>
            <legend className="eyebrow mb-2">Size</legend>
            <div className="grid grid-cols-3">
              {SIZES_ML.map((size) => (
                <label key={size} className="block">
                  <input type="radio" name={`size-${panelId}`} value={size} checked={sizeMl === size} onChange={() => setSizeMl(size)} className="peer sr-only" />
                  <span className="flex min-h-11 cursor-pointer items-center justify-center border border-border font-display text-xs font-medium tracking-[0.1em] peer-checked:border-btn peer-checked:bg-btn peer-checked:text-btn-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary">
                    {size}ml
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between">
            <span className="eyebrow">Quantity</span>
            <div className="flex items-center">
              <button type="button" aria-label="Fewer" onClick={() => setQty(Math.max(1, qty - 1))} className="flex size-11 items-center justify-center text-secondary"><MinusIcon /></button>
              <span aria-live="polite" className="w-6 text-center">{qty}</span>
              <button type="button" aria-label="More" onClick={() => setQty(Math.min(MAX_LINE_QTY, qty + 1))} className="flex size-11 items-center justify-center text-secondary"><PlusIcon /></button>
            </div>
          </div>

          <button type="button" disabled={!available} onClick={() => setStatus(add({ productId: id, sizeMl, qty }) ? "added" : "full")} className="btn btn-primary w-full">
            {status === "added" ? "Added to cart" : "Add to cart"}
          </button>
          <p role="status" className={status === "full" ? "small text-error" : "sr-only"}>
            {status === "added" && "Added to cart."}
            {status === "full" && "Your cart is full. Remove an item to add more."}
          </p>
          {!available && <p className="small text-error">This scent is out of stock. Visit us or check back soon.</p>}
        </div>
      </div>
    </article>
  );
}
