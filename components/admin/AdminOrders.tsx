"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AttentionBadge } from "@/components/admin/AttentionBadge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdminAuth } from "@/components/admin/AdminShell";
import { useToast } from "@/components/ui/ToastProvider";
import { paymentAttentionLevel, formatWaiting, paymentWaitingSince } from "@/lib/admin-attention";
import type { FulfillmentStatus, Order, OrderStatus } from "@/lib/orders";
import { receiptApiPath } from "@/lib/order-public";
import {
  messageOrderCancelled,
  messagePaymentReceived,
  notifyTitleForPaymentStatus,
  whatsappChatUrl,
} from "@/lib/order-notifications";
import { formatPriceBob } from "@/lib/format";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Sin comprobante",
  pending_review: "Revisar comprobante",
  paid: "Pagado",
  cancelled: "Cancelado",
};

const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  unfulfilled: "Sin preparar",
  preparing: "Preparando",
  ready_pickup: "Listo para retiro",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function paymentWaitingLabel(order: Order) {
  const since = Date.parse(paymentWaitingSince(order));
  if (Number.isNaN(since)) return "—";
  return formatWaiting(Date.now() - since);
}

type StatusFilter = "all" | "pending" | "paid" | "cancelled";
type DatePreset = "7d" | "30d" | "month" | "all" | "custom";

const PAGE_SIZE = 15;

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeForPreset(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const to = toYmd(today);
  if (preset === "all") return { from: "", to: "" };
  if (preset === "month") {
    return { from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`, to };
  }
  if (preset === "7d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toYmd(from), to };
  }
  if (preset === "30d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toYmd(from), to };
  }
  return { from: "", to: "" };
}

export function AdminOrders() {
  const { authHeaders } = useAdminAuth();
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [from, setFrom] = useState(() => rangeForPreset("30d").from);
  const [to, setTo] = useState(() => rangeForPreset("30d").to);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        status: filter,
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/orders?${params}`, {
        headers: authHeaders(),
      });
      const data = (await res.json()) as {
        orders?: Order[];
        pagination?: {
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "No autorizado");
      setOrders(data.orders ?? []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
      if (
        data.pagination &&
        data.pagination.page !== page &&
        data.pagination.page >= 1
      ) {
        setPage(data.pagination.page);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
      notify({
        title: "No se pudieron cargar pedidos",
        description: message,
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [authHeaders, notify, page, filter, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = rangeForPreset(preset);
    setFrom(range.from);
    setTo(range.to);
    setPage(1);
  };

  const patchOrder = async (
    id: string,
    body: { status?: OrderStatus; fulfillmentStatus?: FulfillmentStatus },
  ) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { order?: Order; error?: string };
    if (!res.ok || !data.order) {
      const message = data.error || "No se pudo actualizar";
      setError(message);
      notify({
        title: "Error al actualizar",
        description: message,
        tone: "error",
      });
      return;
    }

    const order = data.order;
    setOrders((prev) => prev.map((o) => (o.id === id ? order : o)));

    if (body.status === "paid") {
      const wa = whatsappChatUrl(
        order.customer.phone,
        messagePaymentReceived(order),
      );
      notify({
        title: notifyTitleForPaymentStatus("paid"),
        description: `${order.id} · ${order.customer.name}`,
        tone: "success",
        durationMs: 9000,
        action: wa
          ? { label: "Avisar cliente por WhatsApp", href: wa }
          : undefined,
      });
      return;
    }

    if (body.status === "cancelled") {
      const wa = whatsappChatUrl(
        order.customer.phone,
        messageOrderCancelled(order),
      );
      notify({
        title: notifyTitleForPaymentStatus("cancelled"),
        description: `${order.id} · ${order.customer.name}`,
        tone: "info",
        durationMs: 9000,
        action: wa
          ? { label: "Avisar cliente por WhatsApp", href: wa }
          : undefined,
      });
    }
  };

  const openReceipt = async (orderId: string) => {
    try {
      const res = await fetch(receiptApiPath(orderId), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("No se pudo abrir el comprobante");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notify({
        title: "Comprobante",
        description:
          err instanceof Error ? err.message : "Error al abrir",
        tone: "error",
      });
    }
  };

  const rangeLabel = useMemo(() => {
    if (!from && !to) return "Todas las fechas";
    if (from && to) return `${from} → ${to}`;
    if (from) return `Desde ${from}`;
    return `Hasta ${to}`;
  }, [from, to]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Ventas"
        title="Pedidos"
        description={
          <>
            {total} resultado{total === 1 ? "" : "s"} · {rangeLabel}
          </>
        }
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="admin-btn-ghost"
          >
            {loading ? "…" : "Actualizar"}
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Todos"],
            ["pending", "Pendientes"],
            ["paid", "Pagados"],
            ["cancelled", "Cancelados"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFilter(id);
              setPage(1);
            }}
            className={`admin-chip ${filter === id ? "is-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-panel space-y-3 p-4 sm:p-5">
        <p className="text-[12px] font-medium text-[color:var(--admin-ink)]">
          Fechas
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["7d", "7 días"],
              ["30d", "30 días"],
              ["month", "Este mes"],
              ["all", "Todo"],
              ["custom", "Personalizado"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              className={`admin-chip ${datePreset === id ? "is-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block text-[12px] text-[color:var(--admin-muted)] sm:flex-1">
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setDatePreset("custom");
                setFrom(e.target.value);
                setPage(1);
              }}
              className="admin-input mt-1.5"
            />
          </label>
          <label className="block text-[12px] text-[color:var(--admin-muted)] sm:flex-1">
            Hasta
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setDatePreset("custom");
                setTo(e.target.value);
                setPage(1);
              }}
              className="admin-input mt-1.5"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
              setDatePreset("all");
              setPage(1);
            }}
            className="admin-btn-ghost"
          >
            Limpiar
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-[13px] text-red-700">{error}</p>
      ) : null}

      {orders.length === 0 && !loading ? (
        <p className="py-16 text-center font-display text-xl text-[color:var(--admin-muted)]">
          No hay pedidos en este filtro.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const waPaid = whatsappChatUrl(
              order.customer.phone,
              messagePaymentReceived(order),
            );
            const waCancel = whatsappChatUrl(
              order.customer.phone,
              messageOrderCancelled(order),
            );

            const attention = paymentAttentionLevel(order);
            const urgentBorder =
              attention === "urgent"
                ? "border-red-800/25"
                : attention === "new"
                  ? "border-[color:var(--admin-ink)]/25"
                  : "border-[color:var(--admin-line)]";

            return (
              <li key={order.id} className={`admin-card ${urgentBorder}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-medium tracking-wide text-[color:var(--admin-ink)]">
                        {order.id}
                      </p>
                      {attention ? <AttentionBadge level={attention} /> : null}
                    </div>
                    <p className="mt-1 text-[12px] text-[color:var(--admin-muted)]">
                      {STATUS_LABEL[order.status]} ·{" "}
                      {
                        FULFILLMENT_LABEL[
                          order.fulfillmentStatus ?? "unfulfilled"
                        ]
                      }{" "}
                      · {new Date(order.createdAt).toLocaleString("es-BO")}
                      {attention
                        ? ` · espera ${paymentWaitingLabel(order)}`
                        : ""}
                    </p>
                  </div>
                  <p className="font-display text-xl text-[color:var(--admin-ink)]">
                    {formatPriceBob(order.subtotal)}
                  </p>
                </div>

                <div className="mt-4 text-[13px] leading-relaxed text-[color:var(--admin-muted)]">
                  <p className="font-medium text-[color:var(--admin-ink)]">
                    {order.customer.name}
                  </p>
                  <p>{order.customer.phone}</p>
                  <p>
                    {order.customer.fulfillment === "pickup"
                      ? "Retiro en tienda"
                      : `Delivery · ${order.customer.address}`}
                    {" · "}
                    {order.customer.city}
                  </p>
                  {order.customer.location?.mapsUrl ? (
                    <p>
                      <a
                        href={order.customer.location.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 transition-opacity hover:opacity-50"
                      >
                        Ver pin en Google Maps
                      </a>
                    </p>
                  ) : null}
                  {order.customer.note ? (
                    <p className="mt-1 italic">Nota: {order.customer.note}</p>
                  ) : null}
                </div>

                <ul className="mt-4 space-y-1 border-t border-[color:var(--admin-line)] pt-4 text-[13px] text-[color:var(--admin-ink)]">
                  {order.items.map((item) => (
                    <li key={item.key} className="flex justify-between gap-3">
                      <span className="truncate">
                        {item.title}
                        {item.optionLabel ? ` (${item.optionLabel})` : ""} ×
                        {item.quantity}
                      </span>
                      <span className="shrink-0 text-[color:var(--admin-muted)]">
                        {formatPriceBob(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap gap-2">
                  {order.receiptFile || order.receiptPath ? (
                    <button
                      type="button"
                      onClick={() => void openReceipt(order.id)}
                      className="admin-btn-ghost"
                    >
                      Ver comprobante
                    </button>
                  ) : null}
                  <Link
                    href={`/pedido/${order.id}/pagar?t=${encodeURIComponent(order.accessToken || "")}`}
                    className="admin-btn-ghost"
                  >
                    Ver pago
                  </Link>
                  {order.status !== "paid" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void patchOrder(order.id, { status: "paid" })
                      }
                      className="admin-btn-primary !min-h-9 !px-3 !text-[12px]"
                    >
                      Aceptar pago
                    </button>
                  ) : null}
                  {order.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void patchOrder(order.id, { status: "cancelled" })
                      }
                      className="admin-btn-ghost"
                    >
                      Cancelar
                    </button>
                  ) : null}
                  {order.status === "paid" && waPaid ? (
                    <a
                      href={waPaid}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn-ghost"
                    >
                      WhatsApp pago
                    </a>
                  ) : null}
                  {order.status === "cancelled" && waCancel ? (
                    <a
                      href={waCancel}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn-ghost"
                    >
                      WhatsApp cancelación
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--admin-line)] pt-6">
          <p className="text-[12px] text-[color:var(--admin-muted)]">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="admin-btn-ghost disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="admin-btn-ghost disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
