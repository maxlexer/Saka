import Link from "next/link";
import { logout } from "../actions";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

const tab = "link tap font-display text-[13px] font-medium uppercase tracking-[0.16em]";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // Guards the shell only. Every page and action checks again.
  return (
    <div className="wrap section">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <nav aria-label="Admin" className="flex gap-8">
          <Link href="/admin" className={tab}>Products</Link>
          <Link href="/admin/transactions" className={tab}>Transactions</Link>
        </nav>
        <form action={logout}>
          <button type="submit" className="btn btn-secondary">Log out</button>
        </form>
      </div>
      {children}
    </div>
  );
}
