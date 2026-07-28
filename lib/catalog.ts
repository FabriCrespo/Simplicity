import products from "@/data/products.json";
import categoriesData from "@/data/categories.json";
import { formatPriceBob } from "@/lib/format";

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  originalPrice: number;
  currency: string;
  images: string[];
  featured: boolean;
  type: string;
  handleStock: boolean;
  currentStock: number;
  position: number;
  options: unknown[];
  createdAt: number | null;
  updatedAt: number | null;
};

const FEATURED_TITLES = [
  "Camisaco Denim",
  "Cross Neck Jacket (Liso)",
  "Cross Neck Jacket (Textura)",
  "Falda Short Mónaco",
  "Gamulán Jacket",
  "Isabella (Encaje Manga Larga)",
  "Isabella Top",
  "Lace Belt (Blanco)",
  "Lace Belt (Negro)",
  "Leather Bomber Jacket",
  "Low Waist Jean",
  "Mónaco Sweater",
  "Sidney Top",
  "Striped Tshirt (Oversize)",
  "Suede Baguette",
  "Teddy Jacket (Cuello/Manga)",
  "Teddy Jacket (Solo Cuello)",
] as const;

const catalog = products as CatalogProduct[];

/** Bumps when catalog JSON is re-extracted — invalidates client caches. */
export const CATALOG_VERSION = `${catalog.length}:${
  catalog.reduce((max, p) => Math.max(max, p.updatedAt ?? 0), 0)
}`;

function normalizeQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* ── Indexes built once per process ─────────────────────────────── */

const productBySlug = new Map<string, CatalogProduct>();
const productsByCategoryName = new Map<string, CatalogProduct[]>();

type SearchDoc = {
  product: CatalogProduct;
  titleNorm: string;
  categoryNorm: string;
  categoryTokens: string[];
  descNorm: string;
};

const searchDocs: SearchDoc[] = [];

for (const product of catalog) {
  productBySlug.set(product.slug, product);

  const list = productsByCategoryName.get(product.category);
  if (list) list.push(product);
  else productsByCategoryName.set(product.category, [product]);

  if (product.type !== "hidden") {
    const categoryNorm = normalizeQuery(product.category);
    searchDocs.push({
      product,
      titleNorm: normalizeQuery(product.title),
      categoryNorm,
      categoryTokens: categoryNorm.split(/[^a-z0-9]+/).filter(Boolean),
      descNorm: normalizeQuery(product.description ?? ""),
    });
  }
}

for (const list of productsByCategoryName.values()) {
  list.sort((a, b) => {
    const featured =
      Number(b.featured) - Number(a.featured) ||
      Number(b.type === "available") - Number(a.type === "available");
    if (featured !== 0) return featured;
    return a.position - b.position || a.title.localeCompare(b.title, "es");
  });
}

const searchResultCache = new Map<string, SearchResult>();
const SEARCH_CACHE_MAX = 80;

function pickBestMatch(matches: CatalogProduct[]): CatalogProduct | undefined {
  if (!matches.length) return undefined;

  return (
    matches.find((p) => p.featured && p.type === "available") ??
    matches.find((p) => p.type === "available") ??
    matches.find((p) => p.featured) ??
    matches[0]
  );
}

let featuredCache: CatalogProduct[] | null = null;

export function getFeaturedProducts(): CatalogProduct[] {
  if (featuredCache) return featuredCache;

  featuredCache = FEATURED_TITLES.map((title) => {
    const matches = catalog.filter(
      (p) =>
        p.title.trim().toLowerCase() === title.toLowerCase() &&
        hasProductMedia(p),
    );
    return pickBestMatch(matches);
  }).filter((p): p is CatalogProduct => Boolean(p));

  return featuredCache;
}

export type ShopCategory = {
  name: string;
  label: string;
  slug: string;
  count: number;
  image: string;
  href: string;
};

const SHOP_CATEGORY_LABELS: Record<string, string> = {
  "Tops & Blusas": "Tops",
  "Sweaters & Hoodies": "Sweaters",
  "Faldas & Shorts": "Faldas",
  Chaquetas: "Chaquetas",
  Pantalones: "Pantalones",
  "Vestidos & Enterizos": "Vestidos",
};

function slugifyCategory(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pickCategoryImage(categoryName: string): string | undefined {
  const inCategory = productsByCategoryName.get(categoryName)?.filter(
    (p) => p.images.length > 0,
  );
  if (!inCategory?.length) return undefined;

  const score = (url: string) => {
    if (url.includes("digitaloceanspaces.com")) return 3;
    if (url.includes("amazonaws.com")) return 2;
    if (url.includes("admin.pency.app")) return 1;
    return 0;
  };

  const ranked = [...inCategory].sort((a, b) => {
    const hostDiff = score(b.images[0]) - score(a.images[0]);
    if (hostDiff !== 0) return hostDiff;
    const featuredBonus =
      Number(b.featured && b.type === "available") -
      Number(a.featured && a.type === "available");
    if (featuredBonus !== 0) return featuredBonus;
    return Number(b.type === "available") - Number(a.type === "available");
  });

  return ranked[0]?.images[0];
}

let shopCategoriesCache = new Map<number, ShopCategory[]>();

/** Top apparel categories by catalog size — editorial shop grid. */
export function getShopCategories(limit = 6): ShopCategory[] {
  const cached = shopCategoriesCache.get(limit);
  if (cached) return cached;

  const counts = new Map<string, number>();
  for (const product of catalog) {
    counts.set(product.category, (counts.get(product.category) || 0) + 1);
  }

  const ranked = [...counts.entries()]
    .filter(([name]) => name in SHOP_CATEGORY_LABELS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const result = ranked
    .map(([name, count]) => {
      const image = pickCategoryImage(name);
      if (!image) return null;
      const slug = slugifyCategory(name);
      return {
        name,
        label: SHOP_CATEGORY_LABELS[name] ?? name,
        slug,
        count,
        image,
        href: `/categoria/${slug}`,
      };
    })
    .filter((c): c is ShopCategory => Boolean(c));

  shopCategoriesCache.set(limit, result);
  return result;
}

export type MenuCategory = {
  name: string;
  slug: string;
  href: string;
};

let menuCategoriesCache: MenuCategory[] | null = null;

/** All catalog categories for the nav sidebar — Gift Cards always last. */
export function getMenuCategories(): MenuCategory[] {
  if (menuCategoriesCache) return menuCategoriesCache;

  const list = (
    categoriesData as { name: string; slug: string; count: number }[]
  )
    .filter((c) => c.count > 0 || c.name.toUpperCase() === "GIFT CARDS")
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      href: `/categoria/${c.slug}`,
    }));

  const gift = list.filter((c) => c.name.toUpperCase() === "GIFT CARDS");
  const rest = list.filter((c) => c.name.toUpperCase() !== "GIFT CARDS");

  menuCategoriesCache = [...rest, ...gift];
  return menuCategoriesCache;
}

export function getCategoryBySlug(slug: string) {
  const fromData = (
    categoriesData as { name: string; slug: string; count: number }[]
  ).find((c) => c.slug === slug);

  if (fromData) {
    return {
      name: fromData.name,
      slug: fromData.slug,
      count: fromData.count,
      href: `/categoria/${fromData.slug}`,
    };
  }

  const names = [...productsByCategoryName.keys()];
  const match = names.find((name) => slugifyCategory(name) === slug);
  if (!match) return null;

  const count = productsByCategoryName.get(match)?.length ?? 0;
  return {
    name: match,
    slug,
    count,
    href: `/categoria/${slug}`,
  };
}

export function isGiftCard(product: Pick<CatalogProduct, "category" | "title">) {
  return (
    product.category.toUpperCase() === "GIFT CARDS" ||
    /^gc\b/i.test(product.title.trim()) ||
    /gift\s*card/i.test(product.title)
  );
}

/** Gift cards are fine without photos; everything else needs at least one image URL. */
export function hasProductMedia(
  product: Pick<CatalogProduct, "category" | "title" | "images">,
) {
  if (isGiftCard(product)) return true;
  return product.images.some(
    (url) => typeof url === "string" && url.trim().length > 0,
  );
}

export function getProductsByCategory(categoryName: string): CatalogProduct[] {
  const list = productsByCategoryName.get(categoryName) ?? [];

  return list.filter((p) => p.type !== "hidden" && hasProductMedia(p));
}

export function getProductBySlug(slug: string): CatalogProduct | null {
  const product = productBySlug.get(slug) ?? null;
  if (!product || product.type === "hidden") return null;
  if (!hasProductMedia(product)) return null;
  return product;
}

export function getAllCategorySlugs(): string[] {
  return getMenuCategories().map((c) => c.slug);
}

export function getAllProductSlugs(): string[] {
  return catalog
    .filter((p) => p.type !== "hidden" && hasProductMedia(p))
    .map((p) => p.slug);
}

export function getCategorySlugForName(name: string): string {
  const fromData = (
    categoriesData as { name: string; slug: string }[]
  ).find((c) => c.name === name);
  return fromData?.slug ?? slugifyCategory(name);
}

export type SearchProductHit = {
  id: string;
  slug: string;
  title: string;
  category: string;
  price: number;
  image: string;
  type: string;
  href: string;
};

export type SearchCategoryHit = {
  name: string;
  slug: string;
  href: string;
  count: number;
};

export type SearchResult = {
  query: string;
  categories: SearchCategoryHit[];
  products: SearchProductHit[];
  version?: string;
};

export function searchCatalog(query: string, limit = 24): SearchResult {
  const q = normalizeQuery(query);
  if (!q) {
    return { query, categories: [], products: [], version: CATALOG_VERSION };
  }

  const cacheKey = `${q}|${limit}`;
  const hit = searchResultCache.get(cacheKey);
  if (hit) return hit;

  const categories = getMenuCategories()
    .filter((c) => categoryNameMatches(c.name, q))
    .map((c) => {
      const meta = (
        categoriesData as { name: string; slug: string; count: number }[]
      ).find((item) => item.slug === c.slug);
      return {
        name: c.name,
        slug: c.slug,
        href: c.href,
        count: meta?.count ?? 0,
      };
    })
    .slice(0, 8);

  const products = searchDocs
    .filter((doc) => hasProductMedia(doc.product) && productDocMatches(doc, q))
    .sort((a, b) => {
      const score = (doc: SearchDoc) => {
        if (doc.titleNorm === q) return 4;
        if (doc.titleNorm.startsWith(q)) return 3;
        if (doc.titleNorm.includes(q)) return 2;
        if (doc.categoryTokens.some((t) => t.startsWith(q))) return 1;
        return 0;
      };
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return (
        Number(b.product.featured) - Number(a.product.featured) ||
        Number(b.product.type === "available") -
          Number(a.product.type === "available") ||
        a.product.title.localeCompare(b.product.title, "es")
      );
    })
    .slice(0, limit)
    .map(({ product: p }) => ({
      id: p.id,
      slug: p.slug,
      title: isGiftCard(p)
        ? `Gift Card · ${formatPriceBob(p.price).replace(/\.00$/, "")}`
        : p.title,
      category: p.category,
      price: p.price,
      image: isGiftCard(p) ? "" : (p.images[0] ?? ""),
      type: p.type,
      href: `/producto/${p.slug}`,
    }));

  const result: SearchResult = {
    query,
    categories,
    products,
    version: CATALOG_VERSION,
  };

  if (searchResultCache.size >= SEARCH_CACHE_MAX) {
    const oldest = searchResultCache.keys().next().value;
    if (oldest !== undefined) searchResultCache.delete(oldest);
  }
  searchResultCache.set(cacheKey, result);

  return result;
}

/** Match category by word prefix — avoids "Tops & Blusas" on every short substring. */
function categoryNameMatches(name: string, q: string): boolean {
  if (q.length < 2) return false;
  const n = normalizeQuery(name);
  if (n.startsWith(q)) return true;
  const tokens = n.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some(
    (token) =>
      token.startsWith(q) || (q.length >= 4 && token.includes(q)),
  );
}

function productDocMatches(doc: SearchDoc, q: string): boolean {
  if (q.length < 2) return false;
  if (doc.titleNorm.includes(q)) return true;
  if (
    doc.categoryTokens.some(
      (token) =>
        token.startsWith(q) || (q.length >= 4 && token.includes(q)),
    )
  ) {
    return true;
  }
  // Descriptions only for longer queries (avoid noisy matches)
  if (q.length >= 4 && doc.descNorm.includes(q)) return true;
  return false;
}

export { formatPriceBob } from "@/lib/format";
