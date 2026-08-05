"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AttentionBadge } from "@/components/admin/AttentionBadge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdminAuth } from "@/components/admin/AdminShell";
import { useToast } from "@/components/ui/ToastProvider";
import { shipmentAttentionLevel, formatWaiting } from "@/lib/admin-attention";
import type { FulfillmentStatus, Order } from "@/lib/orders";
import {
  messageFulfillment,
  notifyTitleForFulfillment,
  whatsappChatUrl,
} from "@/lib/order-notifications";
import { formatPriceBob } from "@/lib/format";

const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  unfulfilled: "Sin preparar",
  preparing: "Preparando",
  ready_pickup: "Listo retiro",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function shipmentWaitingLabel(order: Order) {
  const since = Date.parse(order.updatedAt || order.createdAt);
  if (Number.isNaN(since)) return "—";
  return formatWaiting(Date.now() - since);
}

const NEXT_ACTIONS: {
  status: FulfillmentStatus;
  label: string;
  for: ("pickup" | "delivery")[];
}[] = [
  { status: "preparing", label: "Preparar", for: ["pickup", "delivery"] },
  { status: "ready_pickup", label: "Listo para retiro", for: ["pickup"] },
  { status: "shipped", label: "Marcar enviado", for: ["delivery"] },
  {
    status: "delivered",
    label: "Marcar entregado",
    for: ["pickup", "delivery"],
  },
];

export function AdminShipments() {
  const { authHeaders } = useAdminAuth();
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/orders?page=1&pageSize=100&status=paid", {
        headers: authHeaders(),
      });
      const data = (await res.json()) as { orders?: Order[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Error");
      setOrders(data.orders ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
      notify({
        title: "No se pudieron cargar envíos",
        description: message,
        tone: "error",
      });
    }
  }, [authHeaders, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFulfillment = async (
    id: string,
    fulfillmentStatus: FulfillmentStatus,
  ) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ fulfillmentStatus }),
    });
    const data = (await res.json()) as { order?: Order; error?: string };
    if (!res.ok || !data.order) {
      const message = data.error || "No se pudo actualizar";
      setError(message);
      notify({
        title: "Error en logística",
        description: message,
        tone: "error",
      });
      return;
    }

    const order = data.order;
    setOrders((prev) => prev.map((o) => (o.id === id ? order : o)));

    const msg = messageFulfillment(order, fulfillmentStatus);
    const wa =
      msg && whatsappChatUrl(order.customer.phone, msg)
        ? whatsappChatUrl(order.customer.phone, msg)
        : null;

    notify({
      title: notifyTitleForFulfillment(fulfillmentStatus),
      description: `${order.id} · ${order.customer.name}`,
      tone: fulfillmentStatus === "delivered" ? "success" : "info",
      durationMs: 9000,
      action: wa
        ? { label: "Avisar cliente por WhatsApp", href: wa }
        : undefined,
    });
  };

  const list = orders
    .filter((o) => o.status === "paid" || o.status === "pending_review")
    .filter((o) => {
      if (!onlyOpen) return true;
      const fs = o.fulfillmentStatus ?? "unfulfilled";
      return fs !== "delivered" && fs !== "cancelled";
    });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Logística"
        title="Envíos y retiros"
        description="Pedidos pagados listos para preparar, enviar o entregar."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] text-[color:var(--admin-muted)]">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
                className="rounded border-[color:var(--admin-line)]"
              />
              Solo abiertos
            </label>
            <button
              type="button"
              onClick={() => void load()}
              className="admin-btn-ghost"
            >
              Actualizar
            </button>
          </div>
        }
      />

      {error ? (
        <p className="text-[13px] text-red-700">{error}</p>
      ) : null}

      {list.length === 0 ? (
        <p className="py-16 text-center font-display text-xl text-[color:var(--admin-muted)]">
          No hay envíos en este filtro.
        </p>
      ) : (
        <ul className="space-y-4">
          {list.map((order) => {
            const fs = order.fulfillmentStatus ?? "unfulfilled";
            const kind = order.customer.fulfillment;
            const msg = messageFulfillment(order, fs);
            const wa =
              msg && whatsappChatUrl(order.customer.phone, msg)
                ? whatsappChatUrl(order.customer.phone, msg)!
                : null;

            const attention = shipmentAttentionLevel(order);
            const border =
              attention === "urgent"
                ? "border-red-800/25"
                : attention === "new"
                  ? "border-[color:var(--admin-ink)]/25"
                  : "border-[color:var(--admin-line)]";

            return (
              <li key={order.id} className={`admin-card ${border}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-medium tracking-wide text-[color:var(--admin-ink)]">
                        {order.id}
                      </p>
                      {attention ? <AttentionBadge level={attention} /> : null}
                    </div>
                    <p className="mt-1 text-[12px] text-[color:var(--admin-muted)]">
                      {kind === "pickup" ? "Retiro" : "Delivery"} ·{" "}
                      {FULFILLMENT_LABEL[fs]} · {order.customer.city}
                      {attention
                        ? ` · hace ${shipmentWaitingLabel(order)}`
                        : ""}
                    </p>
                  </div>
                  <p className="font-display text-lg text-[color:var(--admin-ink)]">
                    {formatPriceBob(order.subtotal)}
                  </p>
                </div>
                <div className="mt-3 text-[13px] text-[color:var(--admin-muted)]">
                  <p className="font-medium text-[color:var(--admin-ink)]">
                    {order.customer.name}
                  </p>
                  <p>{order.customer.phone}</p>
                  {kind === "delivery" ? (
                    <p>
                      {order.customer.address}
                      {order.customer.location?.mapsUrl ? (
                        <>
                          {" · "}
                          <a
                            href={order.customer.location.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2"
                          >
                            Mapa
                          </a>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p>Retiro en tienda · Cochabamba</p>
                  )}
                </div>
                <ul className="mt-3 text-[13px] text-[color:var(--admin-ink)]">
                  {order.items.map((item) => (
                    <li key={item.key}>
                      {item.title}
                      {item.optionLabel ? ` (${item.optionLabel})` : ""} ×
                      {item.quantity}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {NEXT_ACTIONS.filter((a) => a.for.includes(kind)).map(
                    (action) => (
                      <button
                        key={action.status}
                        type="button"
                        disabled={fs === action.status}
                        onClick={() =>
                          void setFulfillment(order.id, action.status)
                        }
                        className="admin-btn-ghost disabled:opacity-30"
                      >
                        {action.label}
                      </button>
                    ),
                  )}
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn-ghost"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                  <Link href="/admin/pedidos" className="admin-btn-ghost">
                    Ver en pedidos
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
