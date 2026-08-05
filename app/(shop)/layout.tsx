import { CartRoot } from "@/components/cart/CartRoot";
import { CatalogWarmup } from "@/components/CatalogWarmup";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RoutePrefetch } from "@/components/RoutePrefetch";
import { SignatureEffects } from "@/components/SignatureEffects";
import { SHOP_PREFETCH_ROUTES } from "@/lib/prefetch-routes";
import { getMenuCategories } from "@/lib/catalog";

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categoryHrefs = getMenuCategories().map((c) => c.href);

  return (
    <CartRoot>
      <CatalogWarmup />
      <RoutePrefetch hrefs={[...SHOP_PREFETCH_ROUTES, ...categoryHrefs]} />
      <SignatureEffects />
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </CartRoot>
  );
}
