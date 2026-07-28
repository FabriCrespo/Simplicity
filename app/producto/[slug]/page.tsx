import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGallery } from "@/components/ProductGallery";
import {
  getAllProductSlugs,
  getCategorySlugForName,
  getProductBySlug,
} from "@/lib/catalog";

export const dynamic = "force-static";
export const revalidate = false;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Producto" };
  return {
    title: `${product.title} — Simplicity`,
    description:
      product.description ||
      `${product.title} en ${product.category}. Simplicity Bolivia.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const categorySlug = getCategorySlugForName(product.category);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          {
            label: product.category,
            href: `/categoria/${categorySlug}`,
          },
          { label: product.title },
        ]}
      />

      <ProductGallery product={product} />
    </div>
  );
}
