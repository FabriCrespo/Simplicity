/**
 * Extrae categorías y productos desde la tienda Pency de Simplicity.
 * Uso: node scripts/extract-pency.mjs
 *      npm run extract:pency
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STORE_URL = "https://pency.app/simplicitybolivia";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data");

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeProduct(raw) {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description ?? "",
    category: raw.category,
    price: raw.price ?? 0,
    originalPrice: raw.originalPrice ?? raw.price ?? 0,
    currency: "BOB",
    images: Array.isArray(raw.images) ? raw.images : [],
    featured: Boolean(raw.featured),
    type: raw.type ?? "available",
    handleStock: Boolean(raw.handleStock),
    currentStock: raw.currentStock ?? 0,
    position: raw.position ?? 0,
    options: Array.isArray(raw.options) ? raw.options : [],
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SimplicityCatalogBot/1.0; +local-dev)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al pedir ${url}`);
  }

  return res.text();
}

function extractNextData(html) {
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  if (start < 0) {
    throw new Error("No se encontró __NEXT_DATA__ en el HTML de Pency");
  }

  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf("</script>", jsonStart);
  if (jsonEnd < 0) {
    throw new Error("HTML de __NEXT_DATA__ incompleto");
  }

  return JSON.parse(html.slice(jsonStart, jsonEnd));
}

function buildCategories(categoryOrder, products) {
  const counts = new Map();
  for (const product of products) {
    const key = product.category || "Sin categoría";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const ordered = Array.isArray(categoryOrder) ? categoryOrder : [];
  const seen = new Set();
  const categories = [];

  for (const name of ordered) {
    seen.add(name);
    categories.push({
      name,
      slug: slugify(name),
      count: counts.get(name) || 0,
    });
  }

  for (const [name, count] of [...counts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "es")
  )) {
    if (seen.has(name)) continue;
    categories.push({
      name,
      slug: slugify(name),
      count,
    });
  }

  return categories;
}

async function main() {
  console.log(`Descargando ${STORE_URL}...`);
  const html = await fetchHtml(STORE_URL);
  const nextData = extractNextData(html);
  const pageProps = nextData?.props?.pageProps;

  if (!pageProps?.products) {
    throw new Error("pageProps.products no está presente");
  }

  const products = pageProps.products.map(normalizeProduct);
  const categories = buildCategories(
    pageProps.tenant?.categoryOrder,
    products
  );

  const meta = {
    source: STORE_URL,
    slug: pageProps.tenant?.slug ?? "simplicitybolivia",
    title: pageProps.tenant?.title ?? "Simplicity",
    extractedAt: new Date().toISOString(),
    lastUpdate: pageProps.lastUpdate ?? null,
    nextUpdate: pageProps.nextUpdate ?? null,
    productCount: products.length,
    categoryCount: categories.length,
    featuredCount: products.filter((p) => p.featured).length,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const productsPath = path.join(OUT_DIR, "products.json");
  const categoriesPath = path.join(OUT_DIR, "categories.json");
  const metaPath = path.join(OUT_DIR, "catalog-meta.json");

  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf8");
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), "utf8");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");

  console.log(`✓ ${products.length} productos → data/products.json`);
  console.log(`✓ ${categories.length} categorías → data/categories.json`);
  console.log(`✓ meta → data/catalog-meta.json`);
  console.log("Listo.");
}

main().catch((err) => {
  console.error("Error extrayendo catálogo Pency:", err.message);
  process.exit(1);
});
