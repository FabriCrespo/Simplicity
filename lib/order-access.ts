import { randomBytes, timingSafeEqual } from "crypto";
import type { Order } from "@/lib/orders";
import { isValidAdminPin, ADMIN_PIN_HEADER } from "@/lib/admin-auth";

export function makeAccessToken() {
  return randomBytes(24).toString("base64url");
}

export function tokensMatch(
  expected: string | undefined,
  provided: string | null | undefined,
) {
  if (!expected || !provided) return false;
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getOrderTokenFromRequest(request: Request) {
  const header = request.headers.get("x-order-token");
  if (header) return header.trim();
  const { searchParams } = new URL(request.url);
  return (searchParams.get("t") ?? "").trim();
}

/** Admin PIN o token del pedido. */
export function canAccessOrder(request: Request, order: Order) {
  const pin = request.headers.get(ADMIN_PIN_HEADER);
  if (isValidAdminPin(pin)) return true;
  return tokensMatch(order.accessToken, getOrderTokenFromRequest(request));
}

/** Pedido seguro para respuestas al cliente (sin filtrar PII si ya tiene token). */
export function orderForClient(order: Order): Order {
  return order;
}
