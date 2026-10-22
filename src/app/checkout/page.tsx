import { CheckoutForm } from "@/components/CheckoutForm";
import { getCatalog, toCartCatalog } from "@/lib/catalog";

export const revalidate = 300;
export const metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const catalog = await getCatalog();
  return (
    <section aria-labelledby="checkout-title" className="section">
      <div className="wrap">
        <h1 id="checkout-title" className="h2 text-center">Checkout</h1>
        <CheckoutForm catalog={toCartCatalog(catalog)} />
      </div>
    </section>
  );
}
