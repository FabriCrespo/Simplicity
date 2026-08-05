/**
 * Seed de productos a Supabase desde data/products.json
 *
 * Uso:
 *   set NEXT_PUBLIC_SUPABASE_URL=...
 *   set SUPABASE_SECRET_KEY=...   # o SUPABASE_SERVICE_ROLE_KEY
 *   npm run seed:supabase
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY).",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function toRow(p) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description ?? "",
    category: p.category ?? "",
    price: p.price,
    original_price: p.originalPrice ?? p.price,
    currency: p.currency || "BOB",
    images: p.images ?? [],
    featured: Boolean(p.featured),
    type: p.type || "available",
    handle_stock: Boolean(p.handleStock),
    current_stock: p.currentStock ?? 0,
    position: p.position ?? 0,
    options: p.options ?? [],
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    updated_at: p.updatedAt
      ? new Date(p.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

const raw = await readFile(
  path.join(process.cwd(), "data", "products.json"),
  "utf8",
);
const products = JSON.parse(raw);
if (!Array.isArray(products) || products.length === 0) {
  console.error("products.json vacío o inválido");
  process.exit(1);
}

const rows = products.map(toRow);
const chunkSize = 80;
let ok = 0;

for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize);
  const { error } = await supabase.from("products").upsert(chunk);
  if (error) {
    console.error(`Error en chunk ${i}:`, error.message);
    process.exit(1);
  }
  ok += chunk.length;
  console.log(`Upsert ${ok}/${rows.length}`);
}

console.log(`Listo: ${ok} productos en Supabase.`);
