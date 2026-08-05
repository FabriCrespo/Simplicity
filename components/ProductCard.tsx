"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { GiftCardVisual } from "@/components/GiftCardVisual";
import { isGiftCard, type CatalogProduct } from "@/lib/catalog";
import { isImageBroken, markImageBroken } from "@/lib/broken-images";
import { formatPriceBob } from "@/lib/format";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = product.images[0];
  const outOfStock = product.type === "unavailable";
  const gift = isGiftCard(product);
  const [hidden, setHidden] = useState(
    () => !gift && (!image || isImageBroken(image)),
  );

  if (hidden) return null;

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      {gift ? (
        <div className="relative overflow-hidden">
          <GiftCardVisual
            amount={product.price}
            size="tile"
            className="aspect-8/5 w-full"
          />
          {outOfStock ? (
            <span className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.18em] text-background/80">
              Sin stock
            </span>
          ) : null}
        </div>
      ) : (
        <div className="relative aspect-3/4 overflow-hidden bg-border">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              onError={() => {
                markImageBroken(image);
                setHidden(true);
              }}
            />
          ) : null}
          {outOfStock ? (
            <span className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.18em] text-background mix-blend-difference">
              Sin stock
            </span>
          ) : null}
        </div>
      )}

      <div className="mt-3 space-y-1">
        <h3 className="text-[13px] font-light leading-snug tracking-wide text-foreground">
          {gift
            ? `Gift Card · ${formatPriceBob(product.price).replace(/\.00$/, "")}`
            : product.title}
        </h3>
        <p className="text-[12px] font-light tracking-wide text-muted">
          {outOfStock
            ? "Sin stock"
            : gift
              ? "Digital / física"
              : formatPriceBob(product.price)}
        </p>
      </div>
    </Link>
  );
}
