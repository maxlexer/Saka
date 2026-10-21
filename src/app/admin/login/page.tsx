import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { isAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <section aria-labelledby="login-title" className="section">
      <div className="wrap max-w-[420px]">
        <p className="eyebrow text-center">Admin</p>
        <h1 id="login-title" className="h2 mt-3 text-center">Sign in</h1>
        <LoginForm />
      </div>
    </section>
  );
}
