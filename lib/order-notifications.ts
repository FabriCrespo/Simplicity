import type { FulfillmentStatus, Order, OrderStatus } from "@/lib/orders";
import { formatPriceBob } from "@/lib/format";

/** Normaliza celular BO a wa.me (591…). */
export function toWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("591") && digits.length >= 11) return digits;
  if (digits.length === 8) return `591${digits}`;
  if (digits.length === 9 && digits.startsWith("0")) {
    return `591${digits.slice(1)}`;
  }
  if (digits.length >= 10) return digits;
  return null;
}

export function whatsappChatUrl(phone: string, message: string): string | null {
  const normalized = toWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function orderSummary(order: Order) {
  const items = order.items
    .map(
      (i) =>
        `• ${i.title}${i.optionLabel ? ` (${i.optionLabel})` : ""} ×${i.quantity}`,
    )
    .join("\n");
  return `${items}\nTotal: ${formatPriceBob(order.subtotal)}`;
}

export function messageOrderCreated(order: Order) {
  return [
    `Hola ${order.customer.name} 👋`,
    `Tu pedido *${order.id}* en Simplicity quedó registrado.`,
    ``,
    orderSummary(order),
    ``,
    order.customer.fulfillment === "pickup"
      ? "Modalidad: retiro en tienda (Cochabamba)."
      : `Modalidad: delivery — ${order.customer.address ?? ""}\nEl costo de envío lo acordás y pagás directo al motociclista (no está en el total del pedido).`,
    ``,
    "Escaneá el QR y subí el comprobante en la página de pago para confirmar.",
  ].join("\n");
}

export function messagePaymentReceived(order: Order) {
  return [
    `Hola ${order.customer.name} 👋`,
    `¡Confirmamos tu pago del pedido *${order.id}*!`,
    ``,
    orderSummary(order),
    ``,
    order.customer.fulfillment === "pickup"
      ? "Estamos preparando tu pedido para retiro en tienda."
      : "Estamos preparando tu pedido para envío. El costo del delivery lo pagás directo al motociclista al recibir.",
    ``,
    "Gracias por comprar en Simplicity 🖤",
  ].join("\n");
}

export function messageOrderCancelled(order: Order) {
  return [
    `Hola ${order.customer.name},`,
    `Tu pedido *${order.id}* fue cancelado.`,
    ``,
    orderSummary(order),
    ``,
    "Si tenés dudas o querés rehacer el pedido, escribinos por este chat.",
    "— Simplicity Bolivia",
  ].join("\n");
}

export function messageReceiptUnderReview(order: Order) {
  return [
    `Hola ${order.customer.name},`,
    `Recibimos el comprobante del pedido *${order.id}*.`,
    `Está en revisión — te avisamos cuando se confirme el pago.`,
    ``,
    "— Simplicity Bolivia",
  ].join("\n");
}

export function messageFulfillment(
  order: Order,
  status: FulfillmentStatus,
): string | null {
  const base = [`Hola ${order.customer.name},`, `Pedido *${order.id}*`];

  switch (status) {
    case "preparing":
      return [
        ...base,
        `Ya estamos preparando tu pedido.`,
        ``,
        "— Simplicity Bolivia",
      ].join("\n");
    case "ready_pickup":
      return [
        ...base,
        `¡Listo para retiro en tienda!`,
        `Simeón Roncal 1610, Condominio Remanso — Cochabamba.`,
        ``,
        "— Simplicity Bolivia",
      ].join("\n");
    case "shipped":
      return [
        ...base,
        `Tu pedido ya salió en camino 🚚`,
        order.customer.address
          ? `Dirección: ${order.customer.address}`
          : "",
        `El costo de envío lo pagás directo al motociclista al recibir.`,
        ``,
        "— Simplicity Bolivia",
      ]
        .filter(Boolean)
        .join("\n");
    case "delivered":
      return [
        ...base,
        `Marcado como entregado. ¡Que lo disfrutes!`,
        ``,
        "Gracias por comprar en Simplicity 🖤",
      ].join("\n");
    case "cancelled":
      return messageOrderCancelled(order);
    default:
      return null;
  }
}

export function notifyTitleForPaymentStatus(status: OrderStatus): string {
  switch (status) {
    case "paid":
      return "Pago aceptado";
    case "cancelled":
      return "Pedido cancelado";
    case "pending_review":
      return "Comprobante en revisión";
    case "pending_payment":
      return "Pendiente de pago";
    default:
      return "Pedido actualizado";
  }
}

export function notifyTitleForFulfillment(status: FulfillmentStatus): string {
  switch (status) {
    case "preparing":
      return "Pedido en preparación";
    case "ready_pickup":
      return "Listo para retiro";
    case "shipped":
      return "Pedido enviado";
    case "delivered":
      return "Pedido entregado";
    case "cancelled":
      return "Envío cancelado";
    case "unfulfilled":
      return "Sin preparar";
    default:
      return "Logística actualizada";
  }
}
