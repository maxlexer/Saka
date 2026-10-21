"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { encode } from "uqr";
import { clearCart, setActiveOrder, useActiveOrder, useCart } from "@/lib/cart";
import { loadDraft, submitOrder } from "@/lib/checkout-client";
import type { OrderView } from "@/lib/orders";
import { formatUsd } from "@/lib/pricing";
import { detailsSchema } from "@/lib/schemas";
import { CheckIcon } from "./Icons";
import { Modal } from "./Modal";
import { PaymentSkeleton } from "./Skeletons";

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

export function PaymentScreen({ orderId, botUsername }: { orderId: string; botUsername: string }) {
  const router = useRouter();
  const { lines } = useCart();
  const activeOrder = useActiveOrder();
  const { view, refresh } = useOrderView(orderId);
  const [dismissed, setDismissed] = useState(false);
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
      <section className="section">
        <div className="wrap max-w-[520px] text-center">
          <h1 className="h2">We could not find this order.</h1>
          <Link href="/" className="btn btn-primary mt-8">Back home</Link>
        </div>
      </section>
    );
  }

  if (view.state === "expired") {
    return (
      <section className="section">
        <div className="wrap max-w-[520px] text-center">
          <p className="eyebrow">Payment</p>
          <h1 className="h2 mt-3">This code has expired.</h1>
          <p className="mt-4 text-muted">If you have just paid, wait a moment. This page updates on its own.</p>
          {lines?.length ? <p className="mt-2 text-muted">Your cart is saved.</p> : null}
          <button type="button" onClick={newCode} disabled={busy} aria-busy={busy} className="btn btn-primary mt-8">
            {busy ? "Preparing your code" : lines?.length ? "Create a new code" : "Back to checkout"}
          </button>
          {retryError && <p role="alert" className="small mt-4 text-error">{retryError}</p>}
        </div>
      </section>
    );
  }

  if (view.state === "paid") {
    const telegramUrl = `https://t.me/${botUsername}?start=${view.claimToken}`;
    return (
      <section className="section">
        <div className="wrap max-w-[520px] text-center">
          <CheckIcon className="mx-auto text-success" width={32} height={32} />
          <p className="eyebrow mt-4">Payment received</p>
          <h1 className="h2 mt-3">Order {view.orderNumber}</h1>
          <p className="mt-4 text-muted">Thank you. We are preparing your order. Total {formatUsd(view.totalUsd)}, {view.fulfilment}.</p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Get confirmation on Telegram</a>
            <Link href="/products" className="link">Continue browsing</Link>
          </div>
        </div>
        <Modal open={!dismissed} onClose={() => setDismissed(true)} label="Telegram confirmation" from="fade">
          <div className="p-6 text-center">
            <h2 className="h3">Your order is paid</h2>
            <p className="mt-3 text-muted">Get your confirmation on Telegram.</p>
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" onClick={() => setDismissed(true)} className="btn btn-primary mt-6 w-full">Open Telegram</a>
            <button type="button" onClick={() => setDismissed(true)} className="link mt-4 inline-block min-h-11">No thanks</button>
          </div>
        </Modal>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="wrap max-w-[520px] text-center">
        <p className="eyebrow">Pay with KHQR</p>
        <h1 className="h2 mt-3">{formatUsd(view.totalUsd)}</h1>
        <div className="mx-auto mt-8 w-full max-w-[320px] border border-border bg-[#FAF6EE] p-3">
          <Qr value={view.qr} label={`KHQR code for ${formatUsd(view.totalUsd)}`} />
        </div>
        {view.deeplink && (
          <a href={view.deeplink} className="btn btn-primary mt-6 md:hidden">Open banking app</a>
        )}
        <Countdown expiresAt={view.expiresAt} onDone={refresh} />
        <p aria-live="polite" className="mt-4 text-muted">Waiting for payment</p>
        <p className="small mt-6 text-muted">Scan with any Bakong banking app. You can leave this page to pay and come back.</p>
      </div>
    </section>
  );
}
