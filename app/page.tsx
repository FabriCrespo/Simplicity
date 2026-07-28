import { FeaturedProducts } from "@/components/FeaturedProducts";
import { Hero } from "@/components/Hero";
import { ShopCategories } from "@/components/ShopCategories";
import { VisitSection } from "@/components/VisitSection";

export const dynamic = "force-static";
export const revalidate = false;

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedProducts />
      <ShopCategories />
      <VisitSection />
    </>
  );
}
