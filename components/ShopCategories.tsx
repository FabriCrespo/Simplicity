import { getShopCategories } from "@/lib/catalog";
import { ShopCategoriesView } from "@/components/ShopCategoriesView";

export function ShopCategories() {
  const categories = getShopCategories(6);
  if (categories.length < 2) return null;
  return <ShopCategoriesView categories={categories} />;
}
