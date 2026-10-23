import { PaymentScreen } from "@/components/PaymentScreen";

export const metadata = { title: "Payment", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <PaymentScreen orderId={orderId} />;
}
