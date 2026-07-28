import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { formatPriceBob } from "@/lib/format";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = product.images[0];
  const outOfStock = product.type === "unavailable";

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative aspect-3/4 overflow-hidden bg-border">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : null}
        {outOfStock ? (
          <span className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.18em] text-background mix-blend-difference">
            Sin stock
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-[13px] font-light leading-snug tracking-wide text-foreground">
          {product.title}
        </h3>
        <p className="text-[12px] font-light tracking-wide text-muted">
          {outOfStock ? "Sin stock" : formatPriceBob(product.price)}
        </p>
      </div>
    </Link>
  );
}
