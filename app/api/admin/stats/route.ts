import { NextResponse } from "next/server";
import { requireAdminPin } from "@/lib/admin-auth";
import { collectAttentionItems } from "@/lib/admin-attention";
import { readOrders } from "@/lib/orders";
import { readProducts } from "@/lib/products-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const [orders, products] = await Promise.all([readOrders(), readProducts()]);

  const paymentPending = orders.filter(
    (o) => o.status === "pending_payment" || o.status === "pending_review",
  ).length;
  const paid = orders.filter((o) => o.status === "paid").length;
  const shipmentsOpen = orders.filter(
    (o) =>
      o.status === "paid" &&
      o.fulfillmentStatus !== "delivered" &&
      o.fulfillmentStatus !== "cancelled",
  ).length;
  const available = products.filter((p) => p.type === "available").length;
  const unavailable = products.filter((p) => p.type === "unavailable").length;
  const hidden = products.filter((p) => p.type === "hidden").length;
  const withStockTracking = products.filter((p) => p.handleStock).length;
  const lowStock = products.filter(
    (p) => p.handleStock && p.currentStock > 0 && p.currentStock <= 3,
  ).length;
  const outOfStock = products.filter(
    (p) =>
      p.type === "unavailable" || (p.handleStock && p.currentStock <= 0),
  ).length;

  const revenuePaid = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.subtotal, 0);

  const attention = collectAttentionItems(orders);
  const attentionUrgent = attention.filter((a) => a.level === "urgent").length;
  const attentionNew = attention.filter((a) => a.level === "new").length;

  return NextResponse.json({
    stats: {
      ordersTotal: orders.length,
      paymentPending,
      paid,
      shipmentsOpen,
      productsTotal: products.length,
      available,
      unavailable,
      hidden,
      withStockTracking,
      lowStock,
      outOfStock,
      revenuePaid,
      attention,
      attentionUrgent,
      attentionNew,
    },
  });
}
