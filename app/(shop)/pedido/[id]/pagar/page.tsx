import { notFound } from "next/navigation";
import { PaymentPanel } from "@/components/checkout/PaymentPanel";
import { tokensMatch } from "@/lib/order-access";
import { getOrderById } from "@/lib/orders";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function OrderPayPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;
  const order = await getOrderById(id);

  if (!order || !tokensMatch(order.accessToken, t)) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PaymentPanel order={order} accessToken={t!} />
    </div>
  );
}
