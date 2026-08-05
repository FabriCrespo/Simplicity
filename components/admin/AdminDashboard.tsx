"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AttentionBadge } from "@/components/admin/AttentionBadge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdminAuth } from "@/components/admin/AdminShell";
import type { AttentionItem } from "@/lib/admin-attention";
import { formatPriceBob } from "@/lib/format";

type Stats = {
  ordersTotal: number;
  paymentPending: number;
  paid: number;
  shipmentsOpen: number;
  productsTotal: number;
  available: number;
  unavailable: number;
  hidden: number;
  withStockTracking: number;
  lowStock: number;
  outOfStock: number;
  revenuePaid: number;
  attention: AttentionItem[];
  attentionUrgent: number;
  attentionNew: number;
};

export function AdminDashboard() {
  const { authHeaders } = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/stats", { headers: authHeaders() });
      const data = (await res.json()) as { stats?: Stats; error?: string };
      if (!res.ok || !data.stats) throw new Error(data.error || "Error");
      setStats({
        ...data.stats,
        attention: data.stats.attention ?? [],
        attentionUrgent: data.stats.attentionUrgent ?? 0,
        attentionNew: data.stats.attentionNew ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }, [authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = stats
    ? [
        {
          label: "Por revisar",
          value: String(stats.paymentPending),
          href: "/admin/pedidos",
          hint: "Comprobantes",
        },
        {
          label: "Envíos abiertos",
          value: String(stats.shipmentsOpen),
          href: "/admin/envios",
          hint: "Logística",
        },
        {
          label: "Pagados",
          value: String(stats.paid),
          href: "/admin/pedidos",
          hint: "Confirmados",
        },
        {
          label: "Ingresos",
          value: formatPriceBob(stats.revenuePaid),
          href: "/admin/pedidos",
          hint: "Pedidos pagados",
        },
        {
          label: "Visibles",
          value: String(stats.available),
          href: "/admin/productos",
          hint: "En catálogo",
        },
        {
          label: "Stock bajo",
          value: String(stats.lowStock),
          href: "/admin/stock",
          hint: "≤ 3 unidades",
        },
        {
          label: "Sin stock",
          value: String(stats.outOfStock),
          href: "/admin/stock",
          hint: "Agotados",
        },
        {
          label: "Catálogo",
          value: String(stats.productsTotal),
          href: "/admin/productos",
          hint: "Total productos",
        },
      ]
    : [];

  const attention = stats?.attention ?? [];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={greeting}
        title="Resumen"
        description="Lo pendiente de atender y el pulso del día."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="admin-btn-ghost"
          >
            Actualizar
          </button>
        }
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {error}
        </p>
      ) : null}

      {!stats && !error ? (
        <p className="py-16 text-center text-[13px] text-[color:var(--admin-muted)]">
          Cargando resumen…
        </p>
      ) : null}

      {stats && attention.length > 0 ? (
        <section className="admin-panel overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--admin-line)] px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-display text-xl text-[color:var(--admin-ink)] sm:text-[1.35rem]">
                Por atender
              </h2>
              <p className="mt-1 text-[12px] text-[color:var(--admin-muted)]">
                {attention.length} pendiente
                {attention.length === 1 ? "" : "s"}
                {stats.attentionUrgent > 0
                  ? ` · ${stats.attentionUrgent} urgente${stats.attentionUrgent === 1 ? "" : "s"}`
                  : ""}
                {stats.attentionNew > 0
                  ? ` · ${stats.attentionNew} nuevo${stats.attentionNew === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          </div>

          <ul className="divide-y divide-[color:var(--admin-line)]">
            {attention.slice(0, 8).map((item) => {
              const href =
                item.kind === "payment" ? "/admin/pedidos" : "/admin/envios";
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={href}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-black/[0.02] sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <AttentionBadge level={item.level} />
                        <span className="text-[12px] text-[color:var(--admin-muted)]">
                          {item.kind === "payment"
                            ? "Comprobante"
                            : item.fulfillment === "pickup"
                              ? "Retiro"
                              : "Envío"}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-[14px] font-medium text-[color:var(--admin-ink)]">
                        {item.customerName}
                        <span className="font-normal text-[color:var(--admin-muted)]">
                          {" "}
                          · {item.id}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-[color:var(--admin-muted)]">
                        {item.city} · hace {item.waitingLabel}
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-lg text-[color:var(--admin-ink)]">
                      {formatPriceBob(item.subtotal)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>

          {attention.length > 8 ? (
            <p className="border-t border-[color:var(--admin-line)] px-5 py-3 text-[12px] text-[color:var(--admin-muted)] sm:px-6">
              +{attention.length - 8} más en pedidos / envíos
            </p>
          ) : null}
        </section>
      ) : null}

      {stats && attention.length === 0 ? (
        <div className="admin-panel px-5 py-4 text-[13px] text-[color:var(--admin-muted)] sm:px-6">
          Todo al día — no hay comprobantes ni envíos sin atender.
        </div>
      ) : null}

      {stats ? (
        <section>
          <h2 className="text-[13px] font-medium text-[color:var(--admin-ink)]">
            Indicadores
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="admin-stat group"
              >
                <p className="text-[12px] text-[color:var(--admin-muted)]">
                  {card.label}
                </p>
                <p className="mt-2 font-display text-[1.65rem] leading-none tracking-tight text-[color:var(--admin-ink)] transition-transform group-hover:translate-x-0.5">
                  {card.value}
                </p>
                <p className="mt-2 text-[11px] text-[color:var(--admin-muted)]">
                  {card.hint}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-[13px] font-medium text-[color:var(--admin-ink)]">
          Accesos
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/pedidos", label: "Pedidos", sub: "Pagos y revisión" },
            { href: "/admin/envios", label: "Envíos", sub: "Retiros y delivery" },
            {
              href: "/admin/productos",
              label: "Productos",
              sub: "Catálogo y variantes",
            },
            { href: "/admin/stock", label: "Stock", sub: "Inventario" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="admin-access">
              <span className="font-medium text-[color:var(--admin-ink)]">
                {item.label}
              </span>
              <span className="mt-0.5 block text-[12px] text-[color:var(--admin-muted)]">
                {item.sub}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
