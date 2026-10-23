"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { encode } from "uqr";
import { clearCart, setActiveOrder, useActiveOrder, useCart } from "@/lib/cart";
import { loadDraft, submitOrder } from "@/lib/checkout-client";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";
import type { OrderView } from "@/lib/orders";
import { DELIVERY_FEE_USD, formatUsd } from "@/lib/pricing";
import { detailsSchema } from "@/lib/schemas";
import { HOURS, STORE, TELEGRAM_HREF } from "@/lib/store";
import { ArrowIcon } from "./Icons";
import { Logo } from "./Logo";
import { PaymentSkeleton } from "./Skeletons";
import { ShopContact } from "./ShopContact";

type Loaded = OrderView | { state: "missing" };
const QR_LIFETIME_MS = 10 * 60_000;
const POLL_MS = 3000;
/** Keep checking for two minutes after expiry, so a payment made in the last seconds still lands. */
const EXPIRED_POLLS = 40;

function useOrderView(orderId: string) {
  const [view, setView] = useState<Loaded | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    let expiredPolls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!live) return;
        if (res.status === 404) return setView({ state: "missing" });
        if (!res.ok) throw new Error("status failed");
        const next = (await res.json()) as OrderView;
        setView(next);
        if (next.state === "paid" || (next.state === "expired" && ++expiredPolls > EXPIRED_POLLS)) return;
      } catch {
        // Network trouble: keep the last screen and try again.
      }
      timer = setTimeout(tick, POLL_MS);
    };
    const onVisible = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    void tick();
    return () => {
      live = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [orderId, nonce]);

  return { view, refresh };
}

function Qr({ value, label }: { value: string; label: string }) {
  const { data, size } = encode(value, { ecc: "M", border: 2 });
  const path = data.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join("");
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className="block h-auto w-full">
      <rect width={size} height={size} fill="#FAF6EE" />
      <path d={path} fill="#171A12" />
    </svg>
  );
}

function Countdown({ expiresAt, onDone }: { expiresAt: string; onDone: () => void }) {
  const remaining = () => Math.max(0, Date.parse(expiresAt) - Date.now());
  const [left, setLeft] = useState(remaining);
  useEffect(() => {
    const id = setInterval(() => {
      const ms = remaining();
      setLeft(ms);
      if (ms === 0) {
        clearInterval(id);
        onDone();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onDone]);
  const seconds = Math.ceil(left / 1000);
  return (
    <div className="mx-auto mt-6 max-w-[320px]">
      <div className="h-1 bg-border" aria-hidden="true">
        <div className="h-full origin-left bg-secondary transition-transform duration-1000 ease-linear" style={{ transform: `scaleX(${left / QR_LIFETIME_MS})` }} />
      </div>
      <p className="small mt-2 text-muted">Code valid for {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
    </div>
  );
}

/** Every state sits in the same column with the shop contact line last, so help is always in the same place. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <section className="section linen">
      <div className="wrap max-w-[520px] text-center">
        {children}
        <ShopContact className="mt-12 border-t border-border pt-6" />
      </div>
    </section>
  );
}

/**
 * The counter receipt: a paper slip on the pouch linen. It holds the code while paying and the check once paid,
 * so paying and paid read as one object. `lines` print below the dashed rule.
 */
function Receipt({ children, lines }: { children: ReactNode; lines: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-bg px-6 pb-6 pt-8 sm:px-8">
      <Logo showParfum={false} className="mx-auto h-5 w-auto" />
      {children}
      <dl className="small mt-8 space-y-2 border-t border-dashed border-border pt-5 text-left">{lines}</dl>
    </div>
  );
}

function Line({ label, value, strong = false }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-medium" : ""}`}>
      <dt>{label}</dt>
      <dd className="flex-none">{value}</dd>
    </div>
  );
}

/** The same slip as the payment, with the code swapped for a check that draws itself. The rest rises in order. */
function Paid({ view }: { view: Extract<OrderView, { state: "paid" }> }) {
  const root = useRef<HTMLDivElement>(null);
  const pickup = view.fulfilment === "pickup";

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const marks = gsap.utils.toArray<SVGGeometryElement>("[data-draw]");
        const tl = gsap.timeline();
        marks.forEach((mark, i) => {
          const length = mark.getTotalLength();
          tl.fromTo(mark, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, ...MOTION.enter }, i * 0.35);
        });
        tl.from("[data-rise]", { opacity: 0, y: 12, stagger: 0.08, ...MOTION.enter }, 0.45);
      });
    },
    { scope: root },
  );

  return (
    <Frame>
      <div ref={root}>
        <Receipt
          lines={
            <>
              <Line label={pickup ? "Pick up in the shop" : "Delivery"} value={pickup ? "Free" : formatUsd(DELIVERY_FEE_USD)} />
              <Line label="Total paid" value={formatUsd(view.totalUsd)} strong />
            </>
          }
        >
          <svg viewBox="0 0 48 48" width={64} height={64} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" aria-hidden="true" className="mx-auto mt-8 text-success">
            <circle data-draw cx={24} cy={24} r={22} />
            <path data-draw d="M15 24.5l6.5 6.5L33.5 18" />
          </svg>
          <h1 data-rise className="h2 mt-6 text-balance">Order <span className="whitespace-nowrap">{view.orderNumber}</span> is paid</h1>
          <p data-rise className="mt-3 text-muted">Thank you. We received {formatUsd(view.totalUsd)}.</p>
        </Receipt>

        <div data-rise className="mt-10 text-left">
          <h2 className="h3">{pickup ? "Pick up in the shop" : "Delivery"}</h2>
          {pickup ? (
            <>
              <p className="mt-3">Show your order number at the counter.</p>
              <address className="mt-3 not-italic text-muted">{STORE.address}</address>
              {HOURS.map((line) => <p key={line} className="text-muted">{line}</p>)}
              <a href={STORE.mapUrl} target="_blank" rel="noopener noreferrer" className="link tap mt-4 inline-flex items-center gap-2">
                Get directions <ArrowIcon width={18} height={18} />
              </a>
            </>
          ) : (
            <p className="mt-3">We deliver in Phnom Penh within one day. We will message you on Telegram first.</p>
          )}
        </div>

        <div data-rise className="mt-8 rounded-card border border-border bg-surface p-6 text-left">
          <h2 className="h3">Join our Telegram group</h2>
          <p className="small mt-2 text-muted">New scents and shop news, in one quiet place.</p>
          <a href={STORE.telegramGroupUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5 w-full sm:w-auto">
            Join the group
          </a>
        </div>

        <Link data-rise href="/products" className="link tap mt-8 inline-block">Continue browsing</Link>
      </div>
    </Frame>
  );
}

export function PaymentScreen({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { lines } = useCart();
  const activeOrder = useActiveOrder();
  const { view, refresh } = useOrderView(orderId);
  const [retryError, setRetryError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (view?.state === "paid") clearCart();
    if (view?.state === "paid" || (view?.state === "missing" && activeOrder === orderId)) setActiveOrder(null);
  }, [view?.state, activeOrder, orderId]);

  async function newCode() {
    const details = detailsSchema.safeParse(loadDraft());
    if (!lines?.length || !details.success) return router.push("/checkout");
    setBusy(true);
    setRetryError("");
    const result = await submitOrder(lines, details.data);
    if ("orderId" in result) {
      setActiveOrder(result.orderId);
      setBusy(false);
      return router.push(`/checkout/${result.orderId}`);
    }
    setBusy(false);
    setRetryError(result.message);
  }

  if (view === null) return <PaymentSkeleton />;

  if (view.state === "missing") {
    return (
      <Frame>
        <h1 className="h2">We could not find this order.</h1>
        <p className="mt-4 text-muted">The link may be incomplete. If you have paid, send us this reference and we will look it up.</p>
        <p className="small mt-4 break-all">Reference {orderId}</p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <a href={TELEGRAM_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Message us on Telegram</a>
          <Link href="/" className="link tap">Back home</Link>
        </div>
      </Frame>
    );
  }

  if (view.state === "expired") {
    return (
      <Frame>
        <Receipt lines={<Line label="Total" value={formatUsd(view.totalUsd)} strong />}>
          <h1 className="h2 mt-8">This code has expired.</h1>
          <p className="mt-4 text-muted">If you have just paid, wait a moment. This page updates on its own.</p>
          {lines?.length ? <p className="mt-2 text-muted">Your cart is saved.</p> : null}
          <button type="button" onClick={newCode} disabled={busy} aria-busy={busy} className="btn btn-primary mt-8">
            {busy ? "Preparing your code" : lines?.length ? "Create a new code" : "Back to checkout"}
          </button>
          {retryError && <p role="alert" className="small mt-4 text-error">{retryError}</p>}
        </Receipt>
      </Frame>
    );
  }

  if (view.state === "paid") return <Paid view={view} />;

  return (
    <Frame>
      <Receipt
        lines={
          <>
            {view.items.map((item) => (
              <Line key={`${item.name}-${item.sizeMl}`} label={`${item.name}, ${item.sizeMl}ml x${item.qty}`} value={formatUsd(item.priceUsd * item.qty)} />
            ))}
            {view.fulfilment === "delivery" && <Line label="Delivery" value={formatUsd(DELIVERY_FEE_USD)} />}
            <Line label="Total" value={formatUsd(view.totalUsd)} strong />
          </>
        }
      >
        <h1 className="h2 mt-6">Pay {formatUsd(view.totalUsd)}</h1>
        <div className="mx-auto mt-6 w-full max-w-[280px] rounded-sm bg-[#FAF6EE] p-2">
          <Qr value={view.qr} label={`KHQR code for ${formatUsd(view.totalUsd)}`} />
        </div>
        <p className="small mt-3 text-muted">Payment to {STORE.name}</p>
        {view.deeplink && (
          <a href={view.deeplink} className="btn btn-primary mt-6 md:hidden">Open banking app</a>
        )}
        <Countdown expiresAt={view.expiresAt} onDone={refresh} />
        <p aria-live="polite" className="mt-4 text-muted">Waiting for payment</p>
      </Receipt>
      <p className="small mt-6 text-muted">Scan with any Bakong banking app. You can leave this page to pay and come back.</p>
    </Frame>
  );
}
