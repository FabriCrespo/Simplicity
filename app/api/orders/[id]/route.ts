import { NextResponse } from "next/server";
import {
  getOrderById,
  updateOrder,
  type FulfillmentStatus,
  type OrderStatus,
} from "@/lib/orders";
import { requireAdminPin } from "@/lib/admin-auth";
import { canAccessOrder } from "@/lib/order-access";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const PAYMENT_STATUSES: OrderStatus[] = [
  "pending_payment",
  "pending_review",
  "paid",
  "cancelled",
];

const FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  "unfulfilled",
  "preparing",
  "ready_pickup",
  "shipped",
  "delivered",
  "cancelled",
];

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order || !canAccessOrder(request, order)) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ order });
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json()) as {
    status?: string;
    fulfillmentStatus?: string;
    adminNote?: string;
  };

  const patch: {
    status?: OrderStatus;
    fulfillmentStatus?: FulfillmentStatus;
    adminNote?: string;
  } = {};

  if (body.status !== undefined) {
    if (!PAYMENT_STATUSES.includes(body.status as OrderStatus)) {
      return NextResponse.json({ error: "Estado de pago inválido" }, { status: 400 });
    }
    patch.status = body.status as OrderStatus;
  }

  if (body.fulfillmentStatus !== undefined) {
    if (
      !FULFILLMENT_STATUSES.includes(body.fulfillmentStatus as FulfillmentStatus)
    ) {
      return NextResponse.json(
        { error: "Estado de envío inválido" },
        { status: 400 },
      );
    }
    patch.fulfillmentStatus = body.fulfillmentStatus as FulfillmentStatus;
  }

  if (body.adminNote !== undefined) {
    patch.adminNote = String(body.adminNote).trim();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const order = await updateOrder(id, patch);
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo actualizar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
