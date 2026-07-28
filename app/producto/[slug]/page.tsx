import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGallery } from "@/components/ProductGallery";
import {
  getAllProductSlugs,
  getCategorySlugForName,
  getProductBySlug,
  isGiftCard,
} from "@/lib/catalog";
import { formatPriceBob } from "@/lib/format";

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
  const gift = isGiftCard(product);
  const crumbLabel = gift
    ? `Gift Card · ${formatPriceBob(product.price).replace(/\.00$/, "")}`
    : product.title;

  return (
    <div
      className={`mx-auto w-full flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 ${
        gift ? "max-w-xl" : "max-w-6xl"
      }`}
    >
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          {
            label: gift ? "Gift Cards" : product.category,
            href: `/categoria/${categorySlug}`,
          },
          { label: crumbLabel },
        ]}
      />

      <ProductGallery product={product} />
    </div>
  );
}
