"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminProductThumb,
  statusBadgeClass,
  stockTone,
} from "@/components/admin/AdminProductThumb";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdminAuth } from "@/components/admin/AdminShell";
import { useToast } from "@/components/ui/ToastProvider";
import { groupProductsByCategory } from "@/lib/admin-groups";
import type { CatalogProduct } from "@/lib/catalog";
import type {
  ProductOptionChoice,
  ProductOptionGroup,
} from "@/lib/products-store";

const TYPE_LABEL: Record<string, string> = {
  available: "Disponible",
  unavailable: "Sin stock",
  hidden: "Oculto",
  promotional: "Promo",
};

function asGroups(options: unknown): ProductOptionGroup[] {
  if (!Array.isArray(options)) return [];
  return options as ProductOptionGroup[];
}

function StockStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center border border-border">
      <button
        type="button"
        disabled={disabled || value <= 0}
        aria-label="Bajar stock"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-8 w-8 items-center justify-center text-sm text-foreground disabled:opacity-30"
      >
        −
      </button>
      <input
        type="number"
        min={0}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-8 w-12 border-x border-border bg-transparent text-center text-sm tabular-nums outline-none disabled:opacity-40"
      />
      <button
        type="button"
        disabled={disabled}
        aria-label="Subir stock"
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center text-sm text-foreground disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

function stockSummary(p: CatalogProduct) {
  if (!p.handleStock) return "Sin control";
  if (p.currentStock <= 0) return "Agotado";
  if (p.currentStock <= 3) return `Bajo · ${p.currentStock}`;
  return `${p.currentStock} uds`;
}

export function AdminStock() {
  const { authHeaders } = useAdminAuth();
  const { notify } = useToast();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "tracked" | "low" | "out">(
    "all",
  );
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [initializedOpen, setInitializedOpen] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (filter !== "all") params.set("stock", filter);
      const res = await fetch(`/api/admin/products?${params}`, {
        headers: authHeaders(),
      });
      const data = (await res.json()) as {
        products?: CatalogProduct[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Error");
      setProducts(data.products ?? []);
      setDirty(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
      notify({
        title: "No se pudo cargar stock",
        description: message,
        tone: "error",
      });
    }
  }, [authHeaders, q, filter, notify]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const grouped = useMemo(
    () => groupProductsByCategory(products),
    [products],
  );

  useEffect(() => {
    if (initializedOpen || grouped.length === 0) return;
    setOpenCategories(new Set([grouped[0].category]));
    setInitializedOpen(true);
  }, [grouped, initializedOpen]);

  useEffect(() => {
    if (!q.trim() && filter === "all") return;
    setOpenCategories(new Set(grouped.map((g) => g.category)));
  }, [q, filter, grouped]);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const markDirty = (id: string) => {
    setDirty((prev) => new Set(prev).add(id));
  };

  const saveProduct = async (product: CatalogProduct) => {
    setSavingId(product.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          handleStock: product.handleStock,
          currentStock: product.currentStock,
          type: product.type,
          options: product.options,
        }),
      });
      const data = (await res.json()) as {
        product?: CatalogProduct;
        error?: string;
      };
      if (!res.ok || !data.product) throw new Error(data.error || "Error");
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? data.product! : p)),
      );
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      notify({
        title: "Stock guardado",
        description: data.product.title,
        tone: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
      notify({
        title: "No se pudo guardar",
        description: message,
        tone: "error",
      });
    } finally {
      setSavingId(null);
    }
  };

  const updateLocal = (id: string, patch: Partial<CatalogProduct>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
    markDirty(id);
  };

  const updateChoice = (
    productId: string,
    groupId: string,
    choiceId: string,
    patch: Partial<ProductOptionChoice>,
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const groups = asGroups(p.options).map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            options: (g.options ?? []).map((c) =>
              c.id === choiceId ? { ...c, ...patch } : c,
            ),
          };
        });
        return { ...p, options: groups };
      }),
    );
    markDirty(productId);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Inventario"
        title="Stock"
        description="Compacto por categoría. Tocá un producto para ajustar stock."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[color:var(--admin-muted)]">
              {products.length} productos
            </span>
            <button
              type="button"
              onClick={() =>
                setOpenCategories(new Set(grouped.map((g) => g.category)))
              }
              className="admin-btn-ghost"
            >
              Abrir todo
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenCategories(new Set());
                setOpenProductId(null);
              }}
              className="admin-btn-ghost"
            >
              Cerrar todo
            </button>
          </div>
        }
      />

      <div className="mt-0 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto…"
          className="flex-1 border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Todos"],
              ["tracked", "Con control"],
              ["low", "Bajo"],
              ["out", "Agotados"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${
                filter === id
                  ? "bg-foreground text-background"
                  : "border border-border text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-light text-red-700">{error}</p>
      ) : null}

      <div className="mt-8 space-y-3">
        {grouped.map(({ category, products: items }) => {
          const catOpen = openCategories.has(category);
          const dirtyInCat = items.some((p) => dirty.has(p.id));

          return (
            <section
              key={category}
              className={`border bg-background/40 ${
                dirtyInCat ? "border-foreground/35" : "border-border/80"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={catOpen}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">
                    {category}
                  </span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-muted">
                    {items.length}{" "}
                    {items.length === 1 ? "producto" : "productos"}
                    {dirtyInCat ? " · cambios sin guardar" : ""}
                  </span>
                </span>
                <span className="text-[11px] text-muted" aria-hidden>
                  {catOpen ? "−" : "+"}
                </span>
              </button>

              {catOpen ? (
                <ul className="border-t border-border">
                  {items.map((p) => {
                    const groups = asGroups(p.options);
                    const thumb = p.images?.[0] ?? "";
                    const isDirty = dirty.has(p.id);
                    const expanded = openProductId === p.id;
                    const hasVariants = groups.some(
                      (g) => (g.options ?? []).length > 0,
                    );

                    return (
                      <li
                        key={p.id}
                        className={`border-t border-border/70 ${
                          isDirty ? "bg-foreground/[0.02]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenProductId((prev) =>
                                prev === p.id ? null : p.id,
                              )
                            }
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            aria-expanded={expanded}
                          >
                            <AdminProductThumb
                              src={thumb}
                              alt={p.title}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] text-foreground">
                                {p.title}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] ${statusBadgeClass(p.type)}`}
                                >
                                  {TYPE_LABEL[p.type] ?? p.type}
                                </span>
                                <span
                                  className={`text-[11px] tabular-nums ${stockTone(p.currentStock, p.handleStock)}`}
                                >
                                  {stockSummary(p)}
                                </span>
                              </span>
                            </span>
                            <span
                              className="shrink-0 text-[11px] text-muted"
                              aria-hidden
                            >
                              {expanded ? "−" : "+"}
                            </span>
                          </button>

                          {isDirty ? (
                            <button
                              type="button"
                              disabled={savingId === p.id}
                              onClick={() => void saveProduct(p)}
                              className="shrink-0 bg-foreground px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-background disabled:opacity-40"
                            >
                              {savingId === p.id ? "…" : "Guardar"}
                            </button>
                          ) : null}
                        </div>

                        {expanded ? (
                          <div className="space-y-3 border-t border-border/60 bg-background/60 px-3 py-3 sm:px-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                              <label className="flex cursor-pointer items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={p.handleStock}
                                  onChange={(e) =>
                                    updateLocal(p.id, {
                                      handleStock: e.target.checked,
                                    })
                                  }
                                />
                                Controlar stock
                              </label>

                              <div
                                className={`flex items-center gap-2 ${p.handleStock ? "" : "opacity-40"}`}
                              >
                                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                                  Cantidad
                                </span>
                                <StockStepper
                                  value={p.currentStock}
                                  disabled={!p.handleStock}
                                  onChange={(next) =>
                                    updateLocal(p.id, { currentStock: next })
                                  }
                                />
                              </div>

                              <label className="flex items-center gap-2 text-[12px]">
                                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                                  Estado
                                </span>
                                <select
                                  value={p.type}
                                  onChange={(e) =>
                                    updateLocal(p.id, { type: e.target.value })
                                  }
                                  className="border border-border bg-transparent px-2 py-1.5 text-sm outline-none"
                                >
                                  <option value="available">Disponible</option>
                                  <option value="unavailable">Sin stock</option>
                                  <option value="hidden">Oculto</option>
                                  <option value="promotional">Promo</option>
                                </select>
                              </label>

                              <Link
                                href={`/admin/productos/${p.id}`}
                                className="text-[10px] uppercase tracking-[0.14em] text-muted underline underline-offset-2"
                              >
                                Editar ficha
                              </Link>
                            </div>

                            {hasVariants ? (
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                                  Variantes
                                </p>
                                {groups.map((g) => (
                                  <div key={g.id}>
                                    <p className="text-[11px] text-foreground/80">
                                      {g.title}
                                    </p>
                                    <ul className="mt-1.5 divide-y divide-border/60 border border-border/60">
                                      {(g.options ?? []).map((c) => (
                                        <li
                                          key={c.id}
                                          className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                          <div className="flex flex-wrap items-center gap-3 text-[12px]">
                                            <span className="min-w-16 text-foreground">
                                              {c.title}
                                            </span>
                                            <label className="flex items-center gap-1.5 text-muted">
                                              <input
                                                type="checkbox"
                                                checked={c.enabled !== false}
                                                onChange={(e) =>
                                                  updateChoice(
                                                    p.id,
                                                    g.id,
                                                    c.id,
                                                    {
                                                      enabled: e.target.checked,
                                                    },
                                                  )
                                                }
                                              />
                                              Activa
                                            </label>
                                            <label className="flex items-center gap-1.5 text-muted">
                                              <input
                                                type="checkbox"
                                                checked={c.handleStock}
                                                onChange={(e) =>
                                                  updateChoice(
                                                    p.id,
                                                    g.id,
                                                    c.id,
                                                    {
                                                      handleStock:
                                                        e.target.checked,
                                                    },
                                                  )
                                                }
                                              />
                                              Stock
                                            </label>
                                          </div>
                                          <div
                                            className={`flex items-center gap-2 ${c.handleStock ? "" : "opacity-40"}`}
                                          >
                                            <span
                                              className={`text-[11px] tabular-nums ${stockTone(c.currentStock, c.handleStock)}`}
                                            >
                                              {c.handleStock
                                                ? c.currentStock <= 0
                                                  ? "Agotado"
                                                  : `${c.currentStock}`
                                                : "—"}
                                            </span>
                                            <StockStepper
                                              value={c.currentStock}
                                              disabled={!c.handleStock}
                                              onChange={(next) =>
                                                updateChoice(p.id, g.id, c.id, {
                                                  currentStock: next,
                                                })
                                              }
                                            />
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
