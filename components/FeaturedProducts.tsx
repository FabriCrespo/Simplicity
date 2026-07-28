import { getFeaturedProducts } from "@/lib/catalog";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { Reveal } from "@/components/Reveal";

export function FeaturedProducts() {
  const products = getFeaturedProducts();

  return (
    <section
      id="destacados"
      aria-labelledby="destacados-heading"
      className="border-t border-border bg-background py-12 sm:py-16"
    >
      <Reveal className="mb-8 px-4 text-center sm:mb-10 sm:px-6 lg:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted">
          XOXO
        </p>
        <h2
          id="destacados-heading"
          className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl"
        >
          Destacados
        </h2>
      </Reveal>

      <FeaturedCarousel products={products} />
    </section>
  );
}
