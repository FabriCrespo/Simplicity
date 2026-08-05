"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import {
  buildVariantGroups,
  COMMON_COLORS,
  parseList,
  resolveSizes,
  VARIANT_MODE_HELP,
  type SizePreset,
  type VariantMode,
} from "@/lib/product-variants";

const CATEGORIES = [
  "Nueva Colección (AW)",
  "Lace Collection",
  "Bodys",
  "Tops & Blusas",
  "Corset",
  "Pantalones",
  "Faldas & Shorts",
  "Chaquetas",
  "Sweaters & Hoodies",
  "Chalecos",
  "Conjuntos",
  "Vestidos & Enterizos",
  "Accesorios",
  "Cinturones",
  "Bolsos & Billeteras",
  "GIFT CARDS",
  "Relojes Mujer",
  "Varón",
  "Basic Set (3x270)",
  "Pack Manga Larga (3 x Bs. 294)",
];

type Props = {
  open: boolean;
  onClose: () => void;
  authHeaders: () => HeadersInit;
  onCreated: (id: string) => void;
  extraCategories?: string[];
};

const field =
  "mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground";

export function CreateProductModal({
  open,
  onClose,
  authHeaders,
  onCreated,
  extraCategories = [],
}: Props) {
  const { notify } = useToast();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[3]);
  const [customCategory, setCustomCategory] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imagesRaw, setImagesRaw] = useState("");
  const [type, setType] = useState("hidden");
  const [featured, setFeatured] = useState(false);
  const [mode, setMode] = useState<VariantMode>("none");
  const [sizePreset, setSizePreset] = useState<SizePreset>("letters");
  const [customSizes, setCustomSizes] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>(["Negro", "Blanco"]);
  const [customColor, setCustomColor] = useState("");
  const [trackStock, setTrackStock] = useState(false);
  const [stockQty, setStockQty] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const categories = useMemo(() => {
    const set = new Set([...CATEGORIES, ...extraCategories.filter(Boolean)]);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [extraCategories]);

  const sizes = useMemo(
    () => resolveSizes(sizePreset, customSizes),
    [sizePreset, customSizes],
  );

  const colors = selectedColors;

  const previewGroups = useMemo(
    () =>
      buildVariantGroups({
        mode,
        colors,
        sizes,
        trackStock,
        stockPerChoice: Math.max(0, Number(stockQty) || 0),
      }),
    [mode, colors, sizes, trackStock, stockQty],
  );

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color)
        ? prev.filter((c) => c !== color)
        : [...prev, color],
    );
  };

  const addCustomColor = () => {
    const list = parseList(customColor);
    if (!list.length) return;
    setSelectedColors((prev) => {
      const next = [...prev];
      for (const c of list) {
        if (!next.includes(c)) next.push(c);
      }
      return next;
    });
    setCustomColor("");
  };

  const reset = () => {
    setTitle("");
    setCategory(CATEGORIES[3]);
    setCustomCategory("");
    setPrice("");
    setOriginalPrice("");
    setDescription("");
    setImagesRaw("");
    setType("hidden");
    setFeatured(false);
    setMode("none");
    setSizePreset("letters");
    setCustomSizes("");
    setSelectedColors(["Negro", "Blanco"]);
    setCustomColor("");
    setTrackStock(false);
    setStockQty("0");
  };

  const submit = async () => {
    if (title.trim().length < 2) {
      notify({
        title: "Falta el título",
        description: "Poné al menos 2 caracteres",
        tone: "error",
      });
      return;
    }

    if (
      (mode === "colors" || mode === "color_then_size" || mode === "size_then_color") &&
      colors.length === 0
    ) {
      notify({
        title: "Faltan colores",
        description: "Elegí al menos un color",
        tone: "error",
      });
      return;
    }

    if (
      (mode === "sizes" || mode === "color_then_size" || mode === "size_then_color") &&
      sizes.length === 0
    ) {
      notify({
        title: "Faltan tallas",
        description: "Definí al menos una talla",
        tone: "error",
      });
      return;
    }

    const finalCategory =
      category === "__custom__"
        ? customCategory.trim() || "Sin categoría"
        : category;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: title.trim(),
          category: finalCategory,
          price: Number(price) || 0,
          originalPrice: Number(originalPrice || price) || 0,
          description: description.trim(),
          images: parseList(imagesRaw),
          type,
          featured,
          handleStock: trackStock && mode === "none",
          currentStock:
            trackStock && mode === "none"
              ? Math.max(0, Number(stockQty) || 0)
              : 0,
          options: previewGroups,
        }),
      });
      const data = (await res.json()) as {
        product?: { id: string; title: string };
        error?: string;
      };
      if (!res.ok || !data.product) throw new Error(data.error || "Error");

      notify({
        title: "Producto creado",
        description: data.product.title,
        tone: "success",
      });
      reset();
      onCreated(data.product.id);
      onClose();
    } catch (err) {
      notify({
        title: "No se pudo crear",
        description: err instanceof Error ? err.message : "Error",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const needsColors =
    mode === "colors" ||
    mode === "color_then_size" ||
    mode === "size_then_color";
  const needsSizes =
    mode === "sizes" ||
    mode === "color_then_size" ||
    mode === "size_then_color";

  return (
    <div className="fixed inset-0 z-200 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-foreground/30"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-product-title"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col border border-border bg-background shadow-[0_24px_80px_-32px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">
              Catálogo
            </p>
            <h2
              id="create-product-title"
              className="mt-1 font-display text-2xl text-foreground"
            >
              Nuevo producto
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] uppercase tracking-[0.16em] text-muted hover:opacity-50"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          {/* Datos básicos */}
          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Datos
            </p>
            <label className="block text-[12px]">
              Título
              <input
                className={field}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Top Halter Liso"
                autoFocus
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px]">
                Categoría
                <select
                  className={field}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__custom__">Otra…</option>
                </select>
              </label>
              {category === "__custom__" ? (
                <label className="block text-[12px]">
                  Nueva categoría
                  <input
                    className={field}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Nombre"
                  />
                </label>
              ) : (
                <label className="block text-[12px]">
                  Estado
                  <select
                    className={field}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="hidden">Oculto (borrador)</option>
                    <option value="available">Disponible</option>
                    <option value="unavailable">Sin stock</option>
                    <option value="promotional">Promo</option>
                  </select>
                </label>
              )}
            </div>

            {category === "__custom__" ? (
              <label className="block text-[12px]">
                Estado
                <select
                  className={field}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="hidden">Oculto (borrador)</option>
                  <option value="available">Disponible</option>
                  <option value="unavailable">Sin stock</option>
                  <option value="promotional">Promo</option>
                </select>
              </label>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px]">
                Precio (BOB)
                <input
                  className={field}
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="189"
                />
              </label>
              <label className="block text-[12px]">
                Precio original (opcional)
                <input
                  className={field}
                  inputMode="decimal"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="Igual al precio si vacío"
                />
              </label>
            </div>

            <label className="block text-[12px]">
              Descripción
              <textarea
                className={`${field} min-h-20 resize-none`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle corto de la prenda"
              />
            </label>

            <label className="block text-[12px]">
              Imágenes (URLs, una por línea)
              <textarea
                className={`${field} min-h-16 resize-none font-mono text-[11px]`}
                value={imagesRaw}
                onChange={(e) => setImagesRaw(e.target.value)}
                placeholder="https://…"
              />
            </label>

            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              Destacado en home
            </label>
          </section>

          {/* Variantes */}
          <section className="space-y-3 border-t border-border pt-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Variantes
            </p>
            <p className="text-[12px] font-light text-muted">
              Elegí el esquema según cómo se vende la prenda en Simplicity.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(VARIANT_MODE_HELP) as VariantMode[]).map((key) => {
                const meta = VARIANT_MODE_HELP[key];
                const active = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`border p-3 text-left transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <span className="block text-[11px] uppercase tracking-[0.14em]">
                      {meta.label}
                    </span>
                    <span
                      className={`mt-1.5 block text-[11px] font-light leading-snug ${
                        active ? "text-background/70" : "text-muted"
                      }`}
                    >
                      {meta.hint}
                    </span>
                    <span
                      className={`mt-1 block text-[10px] italic ${
                        active ? "text-background/55" : "text-muted/80"
                      }`}
                    >
                      {meta.example}
                    </span>
                  </button>
                );
              })}
            </div>

            {needsColors ? (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                  Colores
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_COLORS.map((c) => {
                    const on = selectedColors.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleColor(c)}
                        className={`border px-2.5 py-1 text-[11px] ${
                          on
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    className={field}
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="Otros: Fucsia, Palo de Rosa…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomColor();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomColor}
                    className="shrink-0 border border-border px-3 text-[10px] uppercase tracking-[0.14em]"
                  >
                    Sumar
                  </button>
                </div>
                {selectedColors.length > 0 ? (
                  <p className="text-[11px] text-muted">
                    Seleccionados: {selectedColors.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {needsSizes ? (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                  Tallas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["letters", "S M L XL"],
                      ["fitted", "S/M · M/L"],
                      ["numeric", "36–42"],
                      ["custom", "Custom"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSizePreset(id)}
                      className={`border px-2.5 py-1 text-[11px] ${
                        sizePreset === id
                          ? "border-foreground bg-foreground text-background"
                          : "border-border"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {sizePreset === "custom" ? (
                  <input
                    className={field}
                    value={customSizes}
                    onChange={(e) => setCustomSizes(e.target.value)}
                    placeholder="Ej. XS, S, M o 34, 36, 38"
                  />
                ) : (
                  <p className="text-[11px] text-muted">
                    {sizes.join(" · ")}
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-4 border border-border/70 p-3">
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={trackStock}
                  onChange={(e) => setTrackStock(e.target.checked)}
                />
                Controlar stock
                {mode === "none"
                  ? " del producto"
                  : " por cada opción"}
              </label>
              {trackStock ? (
                <label className="flex items-center gap-2 text-[12px]">
                  Cantidad inicial
                  <input
                    type="number"
                    min={0}
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-20 border border-border bg-transparent px-2 py-1 text-sm outline-none"
                  />
                </label>
              ) : null}
            </div>

            {previewGroups.length > 0 ? (
              <div className="border border-border/70 bg-background/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                  Vista previa · {previewGroups.length} grupo
                  {previewGroups.length === 1 ? "" : "s"} ·{" "}
                  {previewGroups.reduce(
                    (n, g) => n + g.options.length,
                    0,
                  )}{" "}
                  opciones
                </p>
                <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-[12px]">
                  {previewGroups.map((g) => (
                    <li key={g.id}>
                      <span className="text-foreground">{g.title}</span>
                      <span className="text-muted">
                        {" "}
                        → {g.options.map((o) => o.title).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : mode !== "none" ? (
              <p className="text-[12px] text-muted">
                Completá colores/tallas para ver la vista previa.
              </p>
            ) : null}
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="bg-foreground px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-background disabled:opacity-40"
          >
            {submitting ? "Creando…" : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
