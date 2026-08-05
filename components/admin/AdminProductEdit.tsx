"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminProductThumb } from "@/components/admin/AdminProductThumb";
import { useAdminAuth } from "@/components/admin/AdminShell";
import { useToast } from "@/components/ui/ToastProvider";
import type { CatalogProduct } from "@/lib/catalog";
import type { ProductOptionGroup } from "@/lib/products-store";
import { formatPriceBob } from "@/lib/format";

export function AdminProductEdit({ productId }: { productId: string }) {
  const { authHeaders } = useAdminAuth();
  const { notify } = useToast();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        headers: authHeaders(),
      });
      const data = (await res.json()) as {
        product?: CatalogProduct;
        error?: string;
      };
      if (!res.ok || !data.product) throw new Error(data.error || "Error");
      setProduct(data.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }, [authHeaders, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!product) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          category: product.category,
          price: product.price,
          originalPrice: product.originalPrice,
          featured: product.featured,
          type: product.type,
          handleStock: product.handleStock,
          currentStock: product.currentStock,
          position: product.position,
          images: product.images,
          options: product.options as ProductOptionGroup[],
        }),
      });
      const data = (await res.json()) as {
        product?: CatalogProduct;
        error?: string;
      };
      if (!res.ok || !data.product) throw new Error(data.error || "Error");
      setProduct(data.product);
      setSaved(true);
      notify({
        title: "Producto guardado",
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
      setSaving(false);
    }
  };

  if (!product && !error) {
    return (
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
        Cargando…
      </p>
    );
  }

  if (!product) {
    return (
      <div>
        <p className="text-sm text-red-700">{error}</p>
        <Link href="/admin/productos" className="mt-4 inline-block text-[11px] uppercase tracking-[0.16em] text-muted">
          ← Volver
        </Link>
      </div>
    );
  }

  const field =
    "mt-2 w-full border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/admin/productos"
        className="text-[10px] uppercase tracking-[0.18em] text-muted transition-opacity hover:opacity-50"
      >
        ← Productos
      </Link>
      <div className="mt-4 flex items-start gap-4">
        <AdminProductThumb
          src={product.images?.[0]}
          alt={product.title}
          size="md"
        />
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-foreground">
            Editar producto
          </h1>
          <p className="mt-2 truncate text-[11px] text-muted">
            {product.slug} · {product.id}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
            Título
          </span>
          <input
            className={field}
            value={product.title}
            onChange={(e) =>
              setProduct({ ...product, title: e.target.value })
            }
          />
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
            Descripción
          </span>
          <textarea
            className={`${field} min-h-28`}
            value={product.description}
            onChange={(e) =>
              setProduct({ ...product, description: e.target.value })
            }
          />
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
            Categoría
          </span>
          <input
            className={field}
            value={product.category}
            onChange={(e) =>
              setProduct({ ...product, category: e.target.value })
            }
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Precio
            </span>
            <input
              type="number"
              className={field}
              value={product.price}
              onChange={(e) =>
                setProduct({ ...product, price: Number(e.target.value) })
              }
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Precio original
            </span>
            <input
              type="number"
              className={field}
              value={product.originalPrice}
              onChange={(e) =>
                setProduct({
                  ...product,
                  originalPrice: Number(e.target.value),
                })
              }
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Tipo
            </span>
            <select
              className={field}
              value={product.type}
              onChange={(e) =>
                setProduct({ ...product, type: e.target.value })
              }
            >
              <option value="available">Disponible</option>
              <option value="unavailable">Sin stock</option>
              <option value="hidden">Oculto</option>
              <option value="promotional">Promo</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Posición
            </span>
            <input
              type="number"
              className={field}
              value={product.position}
              onChange={(e) =>
                setProduct({ ...product, position: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={product.featured}
            onChange={(e) =>
              setProduct({ ...product, featured: e.target.checked })
            }
          />
          Destacado
        </label>

        <div className="border border-border/80 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={product.handleStock}
              onChange={(e) =>
                setProduct({ ...product, handleStock: e.target.checked })
              }
            />
            Controlar stock
          </label>
          {product.handleStock ? (
            <label className="mt-3 block">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
                Stock actual
              </span>
              <input
                type="number"
                min={0}
                className={field}
                value={product.currentStock}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    currentStock: Math.max(0, Number(e.target.value)),
                  })
                }
              />
            </label>
          ) : null}
        </div>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
            Imágenes (una URL por línea)
          </span>
          <textarea
            className={`${field} min-h-24 font-mono text-[12px]`}
            value={product.images.join("\n")}
            onChange={(e) =>
              setProduct({
                ...product,
                images: e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>

        {Array.isArray(product.options) && product.options.length > 0 ? (
          <div className="border border-border/80 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Variantes
            </p>
            <p className="mt-2 text-[12px] text-muted">
              Editá stock fino en{" "}
              <Link href="/admin/stock" className="underline">
                Stock
              </Link>
              . Precio base: {formatPriceBob(product.price)}.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm font-light text-red-700">{error}</p>
        ) : null}
        {saved ? (
          <p className="text-sm font-light text-foreground">Guardado.</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="bg-foreground px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-background disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <Link
            href={`/producto/${product.slug}`}
            className="border border-border px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted"
          >
            Ver en tienda
          </Link>
        </div>
      </div>
    </div>
  );
}
