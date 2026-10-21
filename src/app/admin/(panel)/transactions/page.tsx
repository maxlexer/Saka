import Link from "next/link";
import { formatUsd } from "@/lib/pricing";
import { paidOrders, paidSince } from "@/lib/supabase";
import { orderNumber } from "@/lib/telegram";
import { phnomPenhStart, phnomPenhTime } from "@/lib/time";

const PER_PAGE = 50;

const sum = (orders: { total_usd: number }[]) => orders.reduce((cents, o) => cents + Math.round(Number(o.total_usd) * 100), 0) / 100;

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);
  const now = new Date();
  const [{ rows, total }, month] = await Promise.all([
    paidOrders(page, PER_PAGE),
    paidSince(phnomPenhStart("month", now).toISOString()),
  ]);
  const dayStart = phnomPenhStart("day", now).getTime();
  const today = month.filter((o) => o.paid_at && Date.parse(o.paid_at) >= dayStart);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const cards = [{ label: "Today", list: today }, { label: "This month", list: month }];

  return (
    <>
      <h1 className="h2 mt-10">Transactions</h1>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map(({ label, list }) => (
          <div key={label} className="rounded-[8px] border border-border bg-surface p-6">
            <dt className="eyebrow">{label}</dt>
            <dd className="h2 mt-3">{formatUsd(sum(list))}</dd>
            <dd className="small mt-1 text-muted">{list.length} paid {list.length === 1 ? "order" : "orders"}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">No paid orders yet.</p>
      ) : (
        <ul className="mt-10 space-y-4">
          {rows.map((o) => (
            <li key={o.id} className="rounded-[8px] border border-border bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="h3">{orderNumber(o.order_number)}</p>
                <p className="small text-muted">{phnomPenhTime(o.paid_at)}</p>
              </div>
              {o.customer_name ? <p className="mt-2">{o.customer_name}, {o.telegram}</p> : <p className="mt-2 text-muted">Details removed</p>}
              <p className="small mt-1 text-muted">
                {o.fulfilment === "delivery" ? "Delivery" : "Pickup"}
                {o.fulfilment === "delivery" && o.map_url && (
                  <>, <a href={o.map_url} target="_blank" rel="noopener noreferrer" className="link text-text">open map</a></>
                )}
              </p>
              <ul className="small mt-3">
                {o.items.map((i) => (
                  <li key={`${i.productId}-${i.sizeMl}`}>{i.name}, {i.sizeMl}ml x{i.qty}</li>
                ))}
              </ul>
              <p className="mt-3 text-right font-medium">{formatUsd(Number(o.total_usd))}</p>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex justify-between">
          {page > 1 ? <Link href={`/admin/transactions?page=${page - 1}`} className="link">Newer</Link> : <span />}
          {page < pages && <Link href={`/admin/transactions?page=${page + 1}`} className="link">Older</Link>}
        </nav>
      )}
    </>
  );
}
