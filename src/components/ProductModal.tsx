"use client";

import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product, SizePrices } from "@/lib/catalog";
import { gsap, MOTION } from "@/lib/gsap";
import { formatUsd } from "@/lib/pricing";
import { MAX_LINE_QTY } from "@/lib/schemas";
import { LABELS, SIZES_ML, type SizeMl } from "@/lib/taxonomy";
import { CloseIcon, MinusIcon, PlusIcon } from "./Icons";
import { Modal } from "./Modal";
import { SpinBottle, type SpinHandle } from "./SpinBottle";

const PARAM = "scent";
const TURN_S = 2.2;
const TURN_EVERY_MS = 6000;
let pushed = false;

function urlWith(slug: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (slug) params.set(PARAM, slug);
  else params.delete(PARAM);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
}

/** Opens the product modal in place. The URL can be shared, and Back closes the modal. */
export function openScent(slug: string) {
  pushed = true;
  window.history.pushState(null, "", urlWith(slug));
}

function closeScent() {
  if (pushed) {
    pushed = false;
    window.history.back();
  } else {
    window.history.replaceState(null, "", urlWith(null));
  }
}

/** Offset and scale that place `el` exactly over `target`, for the card to stage glide. Both boxes are 4:5. */
function flip(target: Element, el: Element) {
  const from = el.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  return { x: from.left - to.left, y: from.top - to.top, scale: from.width / to.width, transformOrigin: "0 0" };
}

export function ProductModal({ products, prices }: { products: Product[]; prices: SizePrices }) {
  const slug = useSearchParams().get(PARAM);
  const product = products.find((p) => p.id === slug) ?? null;
  const [shown, setShown] = useState<Product | null>(product);
  if (product && product !== shown) setShown(product);
  const open = product !== null;
  const stage = useRef<HTMLDivElement>(null);
  const bottle = useRef<SpinHandle>(null);

  // The bottle turns once after it lands, then every few seconds while the modal is open.
  useEffect(() => {
    if (!open) {
      pushed = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const first = window.setTimeout(() => void bottle.current?.spin(TURN_S), MOTION.glide.duration * 1000);
    const again = window.setInterval(() => void bottle.current?.spin(TURN_S), TURN_EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(again);
    };
  }, [open, shown]);

  const card = () => (shown ? document.querySelector(`[data-card-bottle="${shown.id}"]`) : null);

  const onShow = (tl: gsap.core.Timeline) => {
    const target = stage.current;
    if (!target) return;
    tl.fromTo(target.closest("dialog")?.querySelectorAll("[data-reveal]") ?? [], { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.06, ...MOTION.enter }, 0.15);
    const from = card();
    if (!from) return;
    tl.set(from, { opacity: 0 }, 0).fromTo(target, flip(target, from), { x: 0, y: 0, scale: 1, ...MOTION.glide }, 0);
  };

  const onHide = (tl: gsap.core.Timeline) => {
    const target = stage.current;
    const to = card();
    if (!target || !to) return;
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
              <SpinBottle key={shown.id} ref={bottle} dir={`/products/${shown.id}`} alt={`${shown.name} bottle`} sizes="(min-width: 1024px) 440px, 60vw" float className="h-full" />
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
  const [sizeMl, setSizeMl] = useState<SizeMl>(10);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<"added" | "full" | null>(null);
  const { add } = useCart();

  useEffect(() => {
    if (status !== "added") return;
    const timer = setTimeout(() => setStatus(null), 1600);
    return () => clearTimeout(timer);
  }, [status]);

  const rows = [
    ["Top", product.notesTop.join(", ")],
    ["Heart", product.notesHeart.join(", ")],
    ["Base", product.notesBase.join(", ")],
    ["Mood", product.mood],
    ["Occasion", product.occasion],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-6 p-6 lg:p-10">
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
      <fieldset data-reveal>
        <legend className="eyebrow mb-3">Size</legend>
        <div className="grid grid-cols-3 gap-2">
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
      </fieldset>
      <div data-reveal className="flex items-center justify-between">
        <span className="eyebrow">Quantity</span>
        <div className="flex items-center">
          <button type="button" aria-label="Fewer" onClick={() => setQty(Math.max(1, qty - 1))} className="flex size-11 items-center justify-center text-secondary"><MinusIcon /></button>
          <span aria-live="polite" className="w-6 text-center">{qty}</span>
          <button type="button" aria-label="More" onClick={() => setQty(Math.min(MAX_LINE_QTY, qty + 1))} className="flex size-11 items-center justify-center text-secondary"><PlusIcon /></button>
        </div>
      </div>
      <div data-reveal>
        <button
          type="button"
          disabled={!product.available}
          aria-describedby={product.available ? undefined : pillId}
          onClick={() => setStatus(add({ productId: product.id, sizeMl, qty }) ? "added" : "full")}
          className="btn btn-primary w-full"
        >
          {status === "added" ? "Added to cart" : `Add to cart, ${formatUsd(prices[sizeMl] * qty)}`}
        </button>
        <p role="status" className={status === "full" ? "small mt-2 text-error" : "sr-only"}>
          {status === "added" && "Added to cart."}
          {status === "full" && "Your cart is full. Remove an item to add more."}
        </p>
      </div>
    </div>
  );
}
