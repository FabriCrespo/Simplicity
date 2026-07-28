import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import {
  getAllCategorySlugs,
  getCategoryBySlug,
  getProductsByCategory,
} from "@/lib/catalog";

export const dynamic = "force-static";
export const revalidate = false;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Categoría" };
  return {
    title: `${category.name} — Simplicity`,
    description: `Shop ${category.name} en Simplicity Bolivia.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const products = getProductsByCategory(category.name);
  const isGiftCategory = category.name.toUpperCase() === "GIFT CARDS";

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: category.name },
        ]}
      />

      <header className="mb-10 text-center sm:mb-14">
        <p className="text-[10px] font-light uppercase tracking-[0.28em] text-muted">
          Shop
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {category.name}
        </h1>
        <p className="mt-3 text-[11px] font-light uppercase tracking-[0.18em] text-muted">
          {products.length} {products.length === 1 ? "pieza" : "piezas"}
        </p>
      </header>

      {products.length === 0 ? (
        <p className="py-20 text-center font-display text-lg italic text-muted">
          Pronto más piezas en esta categoría.
        </p>
      ) : (
        <div
          className={
            isGiftCategory
              ? "mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8"
              : "grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14"
          }
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
