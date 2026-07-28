"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import type { CatalogProduct } from "@/lib/catalog";
import { formatPriceBob } from "@/lib/format";

type OptionChoice = {
  id: string;
  title: string;
  price: number;
  enabled?: boolean;
};

type OptionGroup = {
  title?: string;
  options?: OptionChoice[];
};

export function ProductGallery({ product }: { product: CatalogProduct }) {
  const { addItem } = useCart();
  const images = product.images.length > 0 ? product.images : [];
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  const outOfStock = product.type === "unavailable";

  const groups = product.options as OptionGroup[];
  const firstGroup = groups[0];
  const enabledChoices = useMemo(
    () => (firstGroup?.options ?? []).filter((opt) => opt.enabled !== false),
    [firstGroup]
  );

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    enabledChoices[0]?.id ?? null
  );

  const selectedOption =
    enabledChoices.find((opt) => opt.id === selectedOptionId) ??
    enabledChoices[0];

  const unitPrice = product.price + (selectedOption?.price ?? 0);

  const handleAdd = () => {
    if (outOfStock) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: unitPrice,
      image: product.images[0] ?? "",
      optionLabel: selectedOption?.title.trim(),
      optionId: selectedOption?.id,
    });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <div>
        <div className="relative aspect-3/4 overflow-hidden bg-border">
          {current ? (
            <Image
              src={current}
              alt={product.title}
              fill
              priority
              quality={90}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : null}
        </div>

        {images.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Ver imagen ${index + 1}`}
                className={`relative h-20 w-16 shrink-0 overflow-hidden bg-border transition-opacity ${
                  index === active ? "opacity-100" : "opacity-45 hover:opacity-75"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-center lg:py-8">
        <p className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
          {product.category}
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {product.title}
        </h1>
        <p className="mt-4 text-sm font-light tracking-wide text-muted">
          {outOfStock ? "Sin stock" : formatPriceBob(unitPrice)}
        </p>

        {product.description ? (
          <p className="mt-6 max-w-md text-sm font-light leading-relaxed text-muted">
            {product.description}
          </p>
        ) : null}

        {enabledChoices.length > 0 ? (
          <div className="mt-8">
            <p className="text-[10px] font-light uppercase tracking-[0.22em] text-muted">
              {firstGroup?.title || "Opciones"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {enabledChoices.map((opt) => {
                const selected = opt.id === selectedOption?.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`border px-3 py-1.5 text-[11px] font-light uppercase tracking-[0.14em] transition-colors ${
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:border-foreground/50"
                    }`}
                  >
                    {opt.title.trim()}
                    {opt.price ? ` · +${formatPriceBob(opt.price)}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={outOfStock}
          onClick={handleAdd}
          className="mt-10 inline-flex h-12 w-full max-w-sm items-center justify-center bg-foreground text-[11px] font-light uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto sm:px-12"
        >
          {outOfStock ? "Sin stock" : "Agregar a la bolsa"}
        </button>
      </div>
    </div>
  );
}
