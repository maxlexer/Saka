import { useSyncExternalStore } from "react";
import { z } from "zod";
import { cartLineSchema, MAX_CART_LINES, MAX_LINE_QTY, type CartLine } from "./schemas";

const KEY = "saka.cart";
const listeners = new Set<() => void>();
let lines: CartLine[] | null = null;

const same = (l: CartLine, productId: string, sizeMl: number) => l.productId === productId && l.sizeMl === sizeMl;

export function addLine(cart: CartLine[], line: CartLine): CartLine[] {
  if (cart.some((l) => same(l, line.productId, line.sizeMl))) {
    return cart.map((l) => (same(l, line.productId, line.sizeMl) ? { ...l, qty: Math.min(MAX_LINE_QTY, l.qty + line.qty) } : l));
  }
  return cart.length >= MAX_CART_LINES ? cart : [...cart, { ...line, qty: Math.min(MAX_LINE_QTY, line.qty) }];
}

export function setLineQty(cart: CartLine[], productId: string, sizeMl: number, qty: number): CartLine[] {
  if (qty < 1) return cart.filter((l) => !same(l, productId, sizeMl));
  return cart.map((l) => (same(l, productId, sizeMl) ? { ...l, qty: Math.min(MAX_LINE_QTY, qty) } : l));
}

function readStorage(): CartLine[] {
  try {
    const parsed = z.array(cartLineSchema).safeParse(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function write(next: CartLine[]) {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked. The cart then lives in memory for this tab.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) {
      lines = null;
      notify();
    }
  };
  listeners.add(notify);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot(): CartLine[] {
  lines ??= readStorage();
  return lines;
}

export function useCart() {
  const current = useSyncExternalStore(subscribe, snapshot, () => null);
  return {
    lines: current,
    add: (line: CartLine) => write(addLine(snapshot(), line)),
    setQty: (productId: string, sizeMl: number, qty: number) => write(setLineQty(snapshot(), productId, sizeMl, qty)),
    clear: () => write([]),
  };
}
