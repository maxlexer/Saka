import { PaymentScreen } from "@/components/PaymentScreen";

export const metadata = { title: "Payment | SAKA Parfum", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <PaymentScreen orderId={orderId} botUsername={process.env.TELEGRAM_BOT_USERNAME ?? ""} />;
}
