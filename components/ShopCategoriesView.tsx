"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import type { ShopCategory } from "@/lib/catalog";
import { isImageBroken, markImageBroken } from "@/lib/broken-images";

const TILE_LAYOUT: string[] = [
  "md:col-span-7 md:mt-0",
  "md:col-span-5 md:mt-16",
  "md:col-span-4 md:mt-4",
  "md:col-span-8 md:mt-0 md:translate-y-6",
  "md:col-span-5 md:-mt-4",
  "md:col-span-7 md:mt-10 md:max-w-md md:justify-self-end",
];

function CategoryTile({
  category,
  priority = false,
}: {
  category: ShopCategory;
  priority?: boolean;
}) {
  const [hidden, setHidden] = useState(() => isImageBroken(category.image));
  if (hidden) return null;

  return (
    <Link href={category.href} className="group relative block w-full">
      <div className="relative overflow-hidden bg-border transition-transform duration-700 ease-out active:scale-[0.985] md:group-hover:scale-[1.01]">
        <Image
          src={category.image}
          alt={category.label}
          width={900}
          height={1200}
          priority={priority}
          quality={90}
          sizes="(max-width: 768px) 100vw, 45vw"
          className="h-auto w-full object-contain grayscale contrast-[1.05] transition-[filter,transform] duration-700 ease-out group-active:grayscale-0 group-active:contrast-100 md:group-hover:scale-[1.015] md:group-hover:grayscale-0 md:group-hover:contrast-100"
          onError={() => {
            markImageBroken(category.image);
            setHidden(true);
          }}
        />

        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-85 transition-opacity duration-500 group-active:opacity-55 md:group-hover:opacity-55" />

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/65">
            Shop
          </p>
          <h3 className="mt-1 font-display text-2xl tracking-[0.03em] text-white sm:text-3xl">
            {category.label}
          </h3>
          <p className="mt-1 translate-y-1 text-[10px] uppercase tracking-[0.18em] text-white/80 opacity-70 transition-all duration-500 group-active:translate-y-0 group-active:opacity-100 md:max-h-0 md:overflow-hidden md:opacity-0 md:group-hover:max-h-8 md:group-hover:opacity-100">
            Ver colección — {category.count}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function ShopCategoriesView({
  categories,
}: {
  categories: ShopCategory[];
}) {
  return (
    <section
      id="coleccion"
      aria-labelledby="coleccion-heading"
      className="border-t border-border bg-background"
    >
      <Reveal className="px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted">
          The edit
        </p>
        <h2
          id="coleccion-heading"
          className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          Shop the club
        </h2>
        <p className="mx-auto mt-3 max-w-md font-display text-base italic text-muted sm:text-lg">
          Piezas esenciales. Menos ruido, más presencia.
        </p>
      </Reveal>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-7 sm:grid-cols-2 sm:gap-6 md:grid-cols-12 md:gap-x-8 md:gap-y-10">
          {categories.map((category, index) => (
            <Reveal
              key={category.slug}
              delayMs={index * 70}
              className={TILE_LAYOUT[index] ?? TILE_LAYOUT[5]}
            >
              <CategoryTile category={category} priority={index === 0} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
