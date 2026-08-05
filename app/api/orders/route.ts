import { NextResponse } from "next/server";
import {
  createOrder,
  listOrders,
  type OrderCustomer,
  type OrderListStatusFilter,
} from "@/lib/orders";
import { requireAdminPin } from "@/lib/admin-auth";
import type { CartLineInput } from "@/lib/inventory";

export const runtime = "nodejs";

function isValidCustomer(value: unknown): value is OrderCustomer {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.name === "string" &&
    c.name.trim().length >= 2 &&
    typeof c.phone === "string" &&
    c.phone.trim().length >= 7 &&
    typeof c.city === "string" &&
    c.city.trim().length >= 2 &&
    (c.fulfillment === "pickup" || c.fulfillment === "delivery")
  );
}

const STATUS_FILTERS: OrderListStatusFilter[] = [
  "all",
  "pending",
  "paid",
  "cancelled",
  "pending_payment",
  "pending_review",
];

export async function GET(request: Request) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const statusRaw = (searchParams.get("status") ?? "all") as OrderListStatusFilter;
  const status = STATUS_FILTERS.includes(statusRaw) ? statusRaw : "all";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const result = await listOrders({
    page,
    pageSize,
    status,
    from: from || undefined,
    to: to || undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customer?: unknown;
      items?: unknown;
      lines?: unknown;
      subtotal?: unknown;
    };

    if (!isValidCustomer(body.customer)) {
      return NextResponse.json(
        { error: "Datos del cliente incompletos" },
        { status: 400 },
      );
    }

    const rawLines = Array.isArray(body.lines)
      ? body.lines
      : Array.isArray(body.items)
        ? body.items
        : null;

    if (!rawLines || rawLines.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío" },
        { status: 400 },
      );
    }

    const lines: CartLineInput[] = rawLines.map((raw) => {
      const item = raw as Record<string, unknown>;
      return {
        productId: String(item.productId ?? ""),
        quantity: Math.max(1, Number(item.quantity ?? 1)),
        optionId:
          typeof item.optionId === "string" && item.optionId
            ? item.optionId
            : undefined,
        optionLabel:
          typeof item.optionLabel === "string" && item.optionLabel
            ? item.optionLabel
            : undefined,
      };
    });

    const customerBody = body.customer as OrderCustomer & {
      location?: { lat?: unknown; lng?: unknown; mapsUrl?: unknown };
    };

    const customer: OrderCustomer = {
      name: customerBody.name.trim(),
      phone: customerBody.phone.trim(),
      city: customerBody.city.trim(),
      fulfillment: customerBody.fulfillment,
      address:
        customerBody.fulfillment === "delivery"
          ? String(customerBody.address ?? "").trim() || undefined
          : undefined,
      note: customerBody.note
        ? String(customerBody.note).trim() || undefined
        : undefined,
    };

    if (customer.fulfillment === "delivery") {
      if (!customer.address) {
        return NextResponse.json(
          { error: "La dirección es obligatoria para delivery" },
          { status: 400 },
        );
      }

      const loc = customerBody.location;
      const lat = Number(loc?.lat);
      const lng = Number(loc?.lng);
      if (
        !loc ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        typeof loc.mapsUrl !== "string"
      ) {
        return NextResponse.json(
          { error: "Marcá tu ubicación en el mapa" },
          { status: 400 },
        );
      }

      customer.location = {
        lat,
        lng,
        mapsUrl: loc.mapsUrl,
      };
    }

    const order = await createOrder({ customer, lines });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo crear el pedido";
    const status =
      /stock|carrito|opción|producto|disponible|cantidad/i.test(message)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
