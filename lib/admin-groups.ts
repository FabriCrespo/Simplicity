import type { CatalogProduct } from "@/lib/catalog";

export function groupProductsByCategory(
  products: CatalogProduct[],
): { category: string; products: CatalogProduct[] }[] {
  const map = new Map<string, CatalogProduct[]>();

  for (const product of products) {
    const key = product.category?.trim() || "Sin categoría";
    const list = map.get(key);
    if (list) list.push(product);
    else map.set(key, [product]);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([category, items]) => ({
      category,
      products: [...items].sort((x, y) =>
        x.title.localeCompare(y.title, "es"),
      ),
    }));
}
