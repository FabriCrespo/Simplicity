"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { isImageBroken, markImageBroken } from "@/lib/broken-images";
import { formatPriceBob } from "@/lib/format";

const HOLD_MS = 1800;
const SCROLL_MS = 550;

type Props = {
  products: CatalogProduct[];
};

export function FeaturedCarousel({ products }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const p of products) {
      const img = p.images[0];
      if (!img || isImageBroken(img)) initial.add(p.id);
    }
    return initial;
  });

  const visible = useMemo(
    () => products.filter((p) => !brokenIds.has(p.id) && p.images[0]),
    [products, brokenIds],
  );

  const count = visible.length;

  const loop = useMemo(
    () => (count ? [...visible, ...visible, ...visible] : []),
    [visible, count],
  );

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior) => {
    const root = scrollerRef.current;
    const el = root?.querySelector<HTMLElement>(
      `[data-carousel-index="${index}"]`,
    );
    if (!root || !el) return;

    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta =
      elRect.left - rootRect.left - (rootRect.width - elRect.width) / 2;

    root.scrollBy({ left: delta, behavior });
  }, []);

  const goNext = useCallback(() => {
    setActive((prev) => prev + 1);
  }, []);

  const goPrev = useCallback(() => {
    setActive((prev) => {
      if (prev > 0) return prev - 1;
      scrollToIndex(count, "auto");
      return count - 1;
    });
  }, [count, scrollToIndex]);

  useEffect(() => {
    if (paused || count === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const id = window.setInterval(() => {
      setActive((prev) => prev + 1);
    }, HOLD_MS);

    return () => window.clearInterval(id);
  }, [paused, count]);

  useEffect(() => {
    if (count === 0) return;

    if (active < count * 2) {
      scrollToIndex(active, active === 0 ? "auto" : "smooth");
      return;
    }

    scrollToIndex(active, "smooth");
    const t = window.setTimeout(() => {
      const reset = active % count;
      scrollToIndex(reset, "auto");
      setActive(reset);
    }, SCROLL_MS);

    return () => window.clearTimeout(t);
  }, [active, count, scrollToIndex]);

  if (count === 0) return null;

  const highlighted = active % count;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={goPrev}
        aria-label="Producto anterior"
        className="absolute left-1 top-[30%] z-20 flex size-11 -translate-y-1/2 items-center justify-center text-foreground transition-opacity active:opacity-40 hover:opacity-45 sm:left-4 sm:size-11 lg:left-6"
      >
        <ChevronLeft className="size-7 sm:size-8" strokeWidth={1} />
      </button>

      <button
        type="button"
        onClick={goNext}
        aria-label="Producto siguiente"
        className="absolute right-1 top-[30%] z-20 flex size-11 -translate-y-1/2 items-center justify-center text-foreground transition-opacity active:opacity-40 hover:opacity-45 sm:right-4 sm:size-11 lg:right-6"
      >
        <ChevronRight className="size-7 sm:size-8" strokeWidth={1} />
      </button>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 scrollbar-none sm:gap-4 sm:px-6 lg:gap-5 lg:px-8"
        style={{ scrollbarWidth: "none" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
        aria-roledescription="carrusel"
        aria-label="Productos destacados"
      >
        {loop.map((product, index) => {
          const isActive = index % count === highlighted;
          const image = product.images[0];
          const outOfStock = product.type === "unavailable";

          return (
            <Link
              key={`${product.id}-${index}`}
              href={`/producto/${product.slug}`}
              data-carousel-index={index}
              aria-current={isActive ? "true" : undefined}
              className={`group w-[58vw] shrink-0 snap-center transition-opacity duration-300 ease-out sm:w-[28vw] md:w-[22vw] lg:w-[18vw] ${
                isActive
                  ? "z-10 opacity-100"
                  : "opacity-45"
              }`}
            >
              <div className="relative aspect-3/4 overflow-hidden bg-border">
                {image ? (
                  <Image
                    src={image}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 42vw, (max-width: 1024px) 28vw, 18vw"
                    className={`object-cover transition-[filter] duration-300 ease-out ${
                      isActive ? "grayscale-0" : "grayscale"
                    }`}
                    onError={() => {
                      markImageBroken(image);
                      setBrokenIds((prev) => new Set(prev).add(product.id));
                    }}
                  />
                ) : null}
                {outOfStock ? (
                  <span className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.18em] text-background mix-blend-difference">
                    Sin stock
                  </span>
                ) : null}
              </div>

              <div
                className={`mt-3 space-y-1 ${
                  isActive ? "opacity-100" : "opacity-50"
                }`}
              >
                <h3 className="text-[13px] font-normal leading-snug tracking-wide text-foreground">
                  {product.title}
                </h3>
                <p className="text-[12px] tracking-wide text-muted">
                  {outOfStock ? "Sin stock" : formatPriceBob(product.price)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
