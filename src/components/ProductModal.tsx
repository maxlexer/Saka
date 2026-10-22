"use client";

import { useSearchParams } from "next/navigation";
import { Fragment, useId, useRef, useState } from "react";
import { openCart, useCart } from "@/lib/cart";
import { MAX_LINE_QTY } from "@/lib/cart-line";
import type { Product, SizePrices } from "@/lib/catalog";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";
import { formatUsd } from "@/lib/pricing";
import { closeScent, SCENT_PARAM } from "@/lib/scent-url";
import { LABELS, SIZES_ML, type SizeMl } from "@/lib/taxonomy";
import { CloseIcon, MinusIcon, PlusIcon } from "./Icons";
import { Modal } from "./Modal";
import { SpinBottle } from "./SpinBottle";

/** Offset and scale that place `el` exactly over `target`, for the card to stage glide. Both boxes are 4:5. */
function flip(target: Element, el: Element) {
  const from = el.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  return { x: from.left - to.left, y: from.top - to.top, scale: from.width / to.width, transformOrigin: "0 0" };
}

export function ProductModal({ products, prices }: { products: Product[]; prices: SizePrices }) {
  const slug = useSearchParams().get(SCENT_PARAM);
  const product = products.find((p) => p.id === slug) ?? null;
  const [shown, setShown] = useState<Product | null>(product);
  if (product && product !== shown) setShown(product);
  const open = product !== null;
  const stage = useRef<HTMLDivElement>(null);

  // Glide only from a card the visitor can see: a hidden card has an empty box, and one off screen would glide from nowhere.
  // A perfume can have two cards on home (the preview and a finder result), so the visible one wins.
  const card = () =>
    [...(shown ? document.querySelectorAll(`[data-card-bottle="${shown.id}"]`) : [])].find((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
    }) ?? null;

  // The dialog and its scroller clip their content, so they let the bottle overflow while it travels.
  const unclip = (tl: gsap.core.Timeline, dialog: Element | null) => {
    const clipped = dialog ? [dialog, dialog.firstElementChild] : [];
    tl.set(clipped, { overflow: "visible" }, 0);
    return clipped;
  };

  const onShow = (tl: gsap.core.Timeline) => {
    const target = stage.current;
    if (!target) return;
    const dialog = target.closest("dialog");
    tl.fromTo(dialog?.querySelectorAll("[data-reveal]") ?? [], { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.06, ...MOTION.enter }, 0.15);
    const from = card();
    if (!from) return;
    const clipped = unclip(tl, dialog);
    // The card bottle fades while the dialog fades in, so the hand-off has no gap.
    tl.to(from, { opacity: 0, duration: 0.3, ease: "power1.out" }, 0)
      .fromTo(target, flip(target, from), { x: 0, y: 0, scale: 1, ...MOTION.glide }, 0)
      .set(clipped, { clearProps: "overflow" });
  };

  const onHide = (tl: gsap.core.Timeline) => {
    const target = stage.current;
    const to = card();
    if (!target || !to) return;
    unclip(tl, target.closest("dialog"));
    tl.set(to, { opacity: 0 }, 0)
      .to(target, { ...flip(target, to), ...MOTION.exit }, 0)
      .to(to, { opacity: 1, duration: 0.3, ease: "power1.out" }, MOTION.exit.duration - 0.2);
  };

  return (
    <Modal open={open} onClose={closeScent} label={shown?.name ?? "Perfume"} from="product" onShow={onShow} onHide={onHide}>
      {shown && (
        <div className="relative grid lg:grid-cols-2">
          <button type="button" aria-label="Close" onClick={closeScent} className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center">
            <CloseIcon />
          </button>
          <div className="bg-surface px-6 pb-4 pt-10 lg:p-10">
            <div ref={stage} className="mx-auto aspect-[4/5] h-[38svh] lg:h-auto lg:w-full">
              <SpinBottle key={shown.id} dir={`/products/${shown.id}`} alt={`${shown.name} bottle`} float className="h-full" />
            </div>
          </div>
          <Details key={shown.id} product={shown} prices={prices} />
        </div>
      )}
    </Modal>
  );
}

function Details({ product, prices }: { product: Product; prices: SizePrices }) {
  const pillId = useId();
  const sizeId = useId();
  const note = useRef<HTMLParagraphElement>(null);
  const [sizeMl, setSizeMl] = useState<SizeMl>(10);
  const [qty, setQty] = useState(1);
  // A new object on every add, so a repeat add fades the note in again.
  const [status, setStatus] = useState<{ added: boolean } | null>(null);
  const { add } = useCart();

  useGSAP(
    () => {
      if (!status) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(note.current, { opacity: 0 }, { opacity: 1, ...MOTION.enter });
      });
    },
    { dependencies: [status], revertOnUpdate: true },
  );

  const rows = [
    ["Top", product.notesTop.join(", ")],
    ["Heart", product.notesHeart.join(", ")],
    ["Base", product.notesBase.join(", ")],
    ["Mood", product.mood],
    ["Occasion", product.occasion],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-6 px-6 pt-6 lg:p-10">
      <div data-reveal>
        <p className="eyebrow">{LABELS[product.family]}</p>
        <h2 className="h2 mt-3 text-balance">{product.name}</h2>
        {!product.available && (
          <p id={pillId} className="mt-4 inline-flex rounded-full bg-badge px-3 py-1 font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink">
            Out of stock
          </p>
        )}
      </div>
      <p data-reveal>{product.description}</p>
      <dl data-reveal className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-2">
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt className="eyebrow pt-0.5">{label}</dt>
            <dd className="small">{value}</dd>
          </Fragment>
        ))}
      </dl>
      {/* On phones this bar stays pinned to the bottom of the sheet, so choosing and adding never needs a scroll. */}
      <div data-reveal className="space-y-3 border-t border-border bg-bg pt-4 max-lg:sticky max-lg:bottom-0 max-lg:-mx-6 max-lg:px-6 max-lg:pb-[max(1rem,env(safe-area-inset-bottom))] lg:space-y-4 lg:border-0 lg:pt-0">
        <div className="flex min-h-[18px] items-baseline justify-between gap-4">
          <span id={sizeId} className="eyebrow">Size</span>
          <p ref={note} role="status" className="small text-right">
            {status?.added && (
              <>
                Added.{" "}
                <button type="button" onClick={() => { closeScent(); openCart(); }} className="link tap font-medium">View cart</button>
              </>
            )}
            {status && !status.added && <span className="text-error">Your cart is full. Remove an item to add more.</span>}
          </p>
        </div>
        <div role="radiogroup" aria-labelledby={sizeId} className="grid grid-cols-3 gap-2">
          {SIZES_ML.map((size) => (
            <label key={size} className="block">
              <input type="radio" name="size" value={size} checked={sizeMl === size} onChange={() => setSizeMl(size)} aria-label={`${size}ml, ${formatUsd(prices[size])}`} className="peer sr-only" />
              <span aria-hidden="true" className="flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-sm border border-border transition-colors duration-300 peer-checked:border-btn peer-checked:bg-btn peer-checked:text-btn-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary">
                <span className="font-display text-xs font-medium tracking-[0.1em]">{size}ml</span>
                <span className="small">{formatUsd(prices[size], true)}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <div role="group" aria-label="Quantity" className="flex flex-none items-center rounded-sm border border-border">
            <button type="button" aria-label="Fewer" onClick={() => setQty(Math.max(1, qty - 1))} className="flex size-11 items-center justify-center text-secondary"><MinusIcon /></button>
            <span aria-live="polite" className="w-5 text-center">{qty}</span>
            <button type="button" aria-label="More" onClick={() => setQty(Math.min(MAX_LINE_QTY, qty + 1))} className="flex size-11 items-center justify-center text-secondary"><PlusIcon /></button>
          </div>
          <button
            type="button"
            disabled={!product.available}
            aria-describedby={product.available ? undefined : pillId}
            onClick={() => setStatus({ added: add({ productId: product.id, sizeMl, qty }) })}
            className="btn btn-primary min-w-0 flex-1 px-4"
          >
            {product.available ? `Add to cart, ${formatUsd(prices[sizeMl] * qty)}` : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
