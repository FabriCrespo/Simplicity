import type { Order } from "@/lib/orders";

/** Umbrales de atención en el panel admin (ms). */
export const ATTENTION_MS = {
  /** Pedido con comprobante: se considera "nuevo". */
  paymentNew: 2 * 60 * 60 * 1000,
  /** Pedido con comprobante sin revisar: urgencia. */
  paymentUrgent: 4 * 60 * 60 * 1000,
  /** Envío pagado sin preparar: "nuevo". */
  shipmentNew: 4 * 60 * 60 * 1000,
  /** Envío pagado sin avanzar logística: urgencia. */
  shipmentUrgent: 12 * 60 * 60 * 1000,
} as const;

export type AttentionLevel = "new" | "waiting" | "urgent";

export type AttentionItem = {
  id: string;
  kind: "payment" | "shipment";
  level: AttentionLevel;
  customerName: string;
  city: string;
  fulfillment: "pickup" | "delivery";
  subtotal: number;
  waitingSince: string;
  waitingLabel: string;
};

function levelFromAge(
  ageMs: number,
  newMs: number,
  urgentMs: number,
): AttentionLevel {
  if (ageMs >= urgentMs) return "urgent";
  if (ageMs < newMs) return "new";
  return "waiting";
}

export function formatWaiting(ageMs: number): string {
  const mins = Math.max(0, Math.floor(ageMs / 60_000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export function paymentWaitingSince(order: Order): string {
  return order.receiptUploadedAt ?? order.updatedAt ?? order.createdAt;
}

/** Pedido con comprobante pendiente de aceptar/rechazar. */
export function isPaymentUnattended(order: Order): boolean {
  return order.status === "pending_review";
}

/** Pagado y aún sin arrancar logística. */
export function isShipmentUnattended(order: Order): boolean {
  if (order.status !== "paid") return false;
  const fs = order.fulfillmentStatus ?? "unfulfilled";
  return fs === "unfulfilled";
}

export function paymentAttentionLevel(
  order: Order,
  now = Date.now(),
): AttentionLevel | null {
  if (!isPaymentUnattended(order)) return null;
  const since = Date.parse(paymentWaitingSince(order));
  if (Number.isNaN(since)) return "waiting";
  return levelFromAge(
    now - since,
    ATTENTION_MS.paymentNew,
    ATTENTION_MS.paymentUrgent,
  );
}

export function shipmentAttentionLevel(
  order: Order,
  now = Date.now(),
): AttentionLevel | null {
  if (!isShipmentUnattended(order)) return null;
  const since = Date.parse(order.updatedAt || order.createdAt);
  if (Number.isNaN(since)) return "waiting";
  return levelFromAge(
    now - since,
    ATTENTION_MS.shipmentNew,
    ATTENTION_MS.shipmentUrgent,
  );
}

export function toAttentionItem(
  order: Order,
  kind: "payment" | "shipment",
  now = Date.now(),
): AttentionItem | null {
  const level =
    kind === "payment"
      ? paymentAttentionLevel(order, now)
      : shipmentAttentionLevel(order, now);
  if (!level) return null;

  const waitingSince =
    kind === "payment"
      ? paymentWaitingSince(order)
      : order.updatedAt || order.createdAt;
  const age = now - Date.parse(waitingSince);

  return {
    id: order.id,
    kind,
    level,
    customerName: order.customer.name,
    city: order.customer.city,
    fulfillment: order.customer.fulfillment,
    subtotal: order.subtotal,
    waitingSince,
    waitingLabel: Number.isNaN(age) ? "—" : formatWaiting(age),
  };
}

const LEVEL_RANK: Record<AttentionLevel, number> = {
  urgent: 0,
  waiting: 1,
  new: 2,
};

export function collectAttentionItems(
  orders: Order[],
  now = Date.now(),
): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const order of orders) {
    const payment = toAttentionItem(order, "payment", now);
    if (payment) items.push(payment);
    const shipment = toAttentionItem(order, "shipment", now);
    if (shipment) items.push(shipment);
  }
  return items.sort((a, b) => {
    const rank = LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
    if (rank !== 0) return rank;
    return Date.parse(a.waitingSince) - Date.parse(b.waitingSince);
  });
}

export function attentionLabel(level: AttentionLevel): string {
  if (level === "new") return "Nuevo";
  if (level === "urgent") return "Urgente";
  return "Pendiente";
}
