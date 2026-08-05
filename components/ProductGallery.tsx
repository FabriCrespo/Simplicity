"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { GiftCardVisual } from "@/components/GiftCardVisual";
import { isGiftCard, type CatalogProduct } from "@/lib/catalog";
import { markImageBroken } from "@/lib/broken-images";
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

const GIFT_BLURB =
  "La forma más cute de regalar Simplicity. Canjeable en tienda por la prenda que elijan — XOXO.";

export function ProductGallery({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const { addItem } = useCart();
  const gift = isGiftCard(product);
  const images = !gift && product.images.length > 0 ? product.images : [];
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const current = images.find((_, i) => i >= active && !failed.has(i))
    ?? images.find((_, i) => !failed.has(i));
  const outOfStock = product.type === "unavailable";

  const groups = (product.options as OptionGroup[]) ?? [];
  const multiGroup = groups.length > 1;

  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const activeGroup = multiGroup
    ? groups[selectedGroupIndex] ?? groups[0]
    : groups[0];

  const enabledChoices = useMemo(
    () => (activeGroup?.options ?? []).filter((opt) => opt.enabled !== false),
    [activeGroup],
  );

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Reset choice when group changes or product options load
  const firstEnabledId = enabledChoices[0]?.id ?? null;
  const selectedOption =
    enabledChoices.find((opt) => opt.id === selectedOptionId) ??
    enabledChoices[0];

  const unitPrice = product.price + (selectedOption?.price ?? 0);

  const optionLabel = (() => {
    if (!selectedOption) return undefined;
    if (multiGroup && activeGroup?.title) {
      return `${activeGroup.title.trim()} · ${selectedOption.title.trim()}`;
    }
    return selectedOption.title.trim();
  })();

  const handleAdd = () => {
    if (outOfStock) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      title: gift
        ? `Gift Card · ${formatPriceBob(product.price).replace(/\.00$/, "")}`
        : product.title,
      price: unitPrice,
      image: gift ? "" : (product.images[0] ?? ""),
      optionLabel,
      optionId: selectedOption?.id,
    });
  };

  if (gift) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 sm:gap-10">
        <div className="relative aspect-8/5 w-full overflow-hidden">
          <GiftCardVisual
            amount={product.price}
            size="hero"
            className="absolute inset-0"
          />
        </div>

        <div className="text-center">
          <p className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
            Gift Cards
          </p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Gift Card · {formatPriceBob(product.price).replace(/\.00$/, "")}
          </h1>
          <p className="mt-3 text-sm font-light tracking-wide text-muted">
            {outOfStock ? "Sin stock" : formatPriceBob(unitPrice)}
          </p>
          <p className="mx-auto mt-5 max-w-sm text-sm font-light leading-relaxed text-muted">
            {product.description || GIFT_BLURB}
          </p>

          <button
            type="button"
            disabled={outOfStock}
            onClick={handleAdd}
            className="mt-8 inline-flex h-12 w-full items-center justify-center bg-foreground text-[11px] font-light uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35 sm:mx-auto sm:w-auto sm:px-12"
          >
            {outOfStock ? "Sin stock" : "Agregar a la bolsa"}
          </button>
        </div>
      </div>
    );
  }

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
              onError={() => {
                markImageBroken(current);
                const idx = images.indexOf(current);
                setFailed((prev) => {
                  const next = new Set(prev);
                  if (idx >= 0) next.add(idx);
                  if (next.size >= images.length) {
                    router.replace("/");
                  } else {
                    setActive((a) => a + 1);
                  }
                  return next;
                });
              }}
            />
          ) : null}
        </div>

        {images.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
            {images.map((src, index) =>
              failed.has(index) ? null : (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Ver imagen ${index + 1}`}
                  className={`relative h-20 w-16 shrink-0 overflow-hidden bg-border transition-opacity ${
                    index === active
                      ? "opacity-100"
                      : "opacity-45 hover:opacity-75"
                  }`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                    onError={() => {
                      markImageBroken(src);
                      setFailed((prev) => new Set(prev).add(index));
                    }}
                  />
                </button>
              ),
            )}
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

        {groups.length > 1 ? (
          <div className="mt-8">
            <p className="text-[10px] font-light uppercase tracking-[0.22em] text-muted">
              {/talla/i.test(groups[0]?.title ?? "")
                ? "Talla"
                : "Color / variante"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {groups.map((group, index) => {
                const hasEnabled = (group.options ?? []).some(
                  (o) => o.enabled !== false,
                );
                if (!hasEnabled) return null;
                const selected = index === selectedGroupIndex;
                return (
                  <button
                    key={`${group.title}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedGroupIndex(index);
                      setSelectedOptionId(null);
                    }}
                    className={`border px-3 py-1.5 text-[11px] font-light uppercase tracking-[0.14em] transition-colors ${
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:border-foreground/50"
                    }`}
                  >
                    {group.title?.trim() || `Opción ${index + 1}`}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {enabledChoices.length > 0 ? (
          <div className={groups.length > 1 ? "mt-5" : "mt-8"}>
            <p className="text-[10px] font-light uppercase tracking-[0.22em] text-muted">
              {groups.length > 1
                ? /talla/i.test(activeGroup?.title ?? "")
                  ? "Color"
                  : "Talla"
                : activeGroup?.title || "Opciones"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {enabledChoices.map((opt) => {
                const selected =
                  opt.id === (selectedOption?.id ?? firstEnabledId);
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
