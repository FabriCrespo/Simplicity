"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminProductThumb,
  statusBadgeClass,
} from "@/components/admin/AdminProductThumb";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdminAuth } from "@/components/admin/AdminShell";
import { CreateProductModal } from "@/components/admin/CreateProductModal";
import { useToast } from "@/components/ui/ToastProvider";
import { groupProductsByCategory } from "@/lib/admin-groups";
import type { CatalogProduct } from "@/lib/catalog";
import { formatPriceBob } from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  available: "Disponible",
  unavailable: "Sin stock",
  hidden: "Oculto",
  promotional: "Promo",
};

export function AdminProducts() {
  const { authHeaders } = useAdminAuth();
  const { notify } = useToast();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [initializedOpen, setInitializedOpen] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (type !== "all") params.set("type", type);
      const res = await fetch(`/api/admin/products?${params}`, {
        headers: authHeaders(),
      });
      const data = (await res.json()) as {
        products?: CatalogProduct[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Error");
      setProducts(data.products ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
      notify({
        title: "No se pudieron cargar productos",
        description: message,
        tone: "error",
      });
    }
  }, [authHeaders, q, type, notify]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const grouped = useMemo(
    () => groupProductsByCategory(products),
    [products],
  );

  const extraCategories = useMemo(
    () => grouped.map((g) => g.category),
    [grouped],
  );

  useEffect(() => {
    if (initializedOpen || grouped.length === 0) return;
    setOpenCategories(new Set([grouped[0].category]));
    setInitializedOpen(true);
  }, [grouped, initializedOpen]);

  useEffect(() => {
    if (!q.trim()) return;
    setOpenCategories(new Set(grouped.map((g) => g.category)));
  }, [q, grouped]);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const expandAll = () =>
    setOpenCategories(new Set(grouped.map((g) => g.category)));
  const collapseAll = () => setOpenCategories(new Set());

  const quickType = async (id: string, nextType: string) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ type: nextType }),
    });
    const data = (await res.json()) as {
      product?: CatalogProduct;
      error?: string;
    };
    if (!res.ok || !data.product) {
      const message = data.error || "No se pudo actualizar";
      setError(message);
      notify({ title: "Error", description: message, tone: "error" });
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? data.product! : p)),
    );
    notify({
      title: TYPE_LABEL[nextType] ?? "Actualizado",
      description: data.product.title,
      tone: nextType === "available" ? "success" : "info",
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Agrupados por categoría. Abrí cada grupo para gestionar."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[color:var(--admin-muted)]">
              {products.length} productos
            </span>
            <button type="button" onClick={expandAll} className="admin-btn-ghost">
              Abrir todo
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="admin-btn-ghost"
            >
              Cerrar todo
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="admin-btn-primary !min-h-9 !px-3 !text-[12px]"
            >
              Nuevo producto
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar título, categoría…"
          className="admin-input flex-1"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="admin-input sm:max-w-[12rem]"
        >
          <option value="all">Todos los tipos</option>
          <option value="available">Disponible</option>
          <option value="unavailable">Sin stock</option>
          <option value="hidden">Oculto</option>
          <option value="promotional">Promo</option>
        </select>
      </div>

      {error ? (
        <p className="text-[13px] text-red-700">{error}</p>
      ) : null}

      <div className="space-y-3">
        {grouped.map(({ category, products: items }) => {
          const open = openCategories.has(category);
          return (
            <section key={category} className="admin-panel overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                aria-expanded={open}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-[color:var(--admin-ink)]">
                    {category}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[color:var(--admin-muted)]">
                    {items.length}{" "}
                    {items.length === 1 ? "producto" : "productos"}
                  </span>
                </span>
                <span className="text-[12px] text-[color:var(--admin-muted)]" aria-hidden>
                  {open ? "−" : "+"}
                </span>
              </button>

              {open ? (
                <ul className="divide-y divide-border border-t border-border">
                  {items.map((p) => {
                    const thumb = p.images?.[0] ?? "";
                    return (
                      <li
                        key={p.id}
                        className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
                      >
                        <Link
                          href={`/admin/productos/${p.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-70"
                        >
                          <AdminProductThumb src={thumb} alt={p.title} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-foreground">
                              {p.title}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] ${statusBadgeClass(p.type)}`}
                              >
                                {TYPE_LABEL[p.type] ?? p.type}
                              </span>
                              <span className="text-[11px] text-muted">
                                {formatPriceBob(p.price)}
                              </span>
                              {p.handleStock ? (
                                <span className="text-[11px] text-muted">
                                  Stock {p.currentStock}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </Link>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {p.type !== "available" ? (
                            <button
                              type="button"
                              onClick={() => void quickType(p.id, "available")}
                              className="border border-border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em]"
                            >
                              Publicar
                            </button>
                          ) : null}
                          {p.type !== "hidden" ? (
                            <button
                              type="button"
                              onClick={() => void quickType(p.id, "hidden")}
                              className="border border-border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted"
                            >
                              Ocultar
                            </button>
                          ) : null}
                          {p.type !== "unavailable" ? (
                            <button
                              type="button"
                              onClick={() =>
                                void quickType(p.id, "unavailable")
                              }
                              className="border border-border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted"
                            >
                              Sin stock
                            </button>
                          ) : null}
                          <Link
                            href="/admin/stock"
                            className="border border-border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted"
                          >
                            Stock
                          </Link>
                          <Link
                            href={`/admin/productos/${p.id}`}
                            className="bg-foreground px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-background"
                          >
                            Editar
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      <CreateProductModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        authHeaders={authHeaders}
        extraCategories={extraCategories}
        onCreated={(id) => {
          window.location.href = `/admin/productos/${id}`;
        }}
      />
    </div>
  );
}
