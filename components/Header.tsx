import { getMenuCategories } from "@/lib/catalog";
import { SiteHeader } from "@/components/SiteHeader";

export function Header() {
  const categories = getMenuCategories();
  return <SiteHeader categories={categories} />;
}
