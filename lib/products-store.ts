import type { CatalogProduct } from "@/lib/catalog";
import { readJsonKey, writeJsonKey } from "@/lib/kv-store";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { productToRow, rowToProduct } from "@/lib/supabase-mappers";

export type ProductOptionChoice = {
  id: string;
  title: string;
  price: number;
  enabled?: boolean;
  currentStock: number;
  handleStock: boolean;
};

export type ProductOptionGroup = {
  id: string;
  title: string;
  required?: boolean;
  count?: number;
  value?: unknown[];
  options: ProductOptionChoice[];
};

const PRODUCTS_KEY = "products";

async function readProductsLocal(): Promise<CatalogProduct[]> {
  const products = await readJsonKey<CatalogProduct[]>(
    PRODUCTS_KEY,
    [],
    "products.json",
  );
  return Array.isArray(products) ? products : [];
}

export async function readProducts(): Promise<CatalogProduct[]> {
  if (!isSupabaseConfigured()) {
    return readProductsLocal();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw new Error(`Supabase products: ${error.message}`);
  return (data ?? []).map((row) => rowToProduct(row as Record<string, unknown>));
}

export async function writeProducts(products: CatalogProduct[]) {
  if (!isSupabaseConfigured()) {
    await writeJsonKey(PRODUCTS_KEY, products);
    return;
  }

  const supabase = getSupabaseAdmin();
  const rows = products.map(productToRow);
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("products").upsert(chunk);
    if (error) throw new Error(`Supabase upsert products: ${error.message}`);
  }
}

export async function getProductById(
  id: string,
): Promise<CatalogProduct | null> {
  if (!isSupabaseConfigured()) {
    const products = await readProductsLocal();
    return products.find((p) => p.id === id) ?? null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Supabase product: ${error.message}`);
  return data ? rowToProduct(data as Record<string, unknown>) : null;
}

export type ProductPatch = Partial<
  Pick<
    CatalogProduct,
    | "title"
    | "description"
    | "category"
    | "price"
    | "originalPrice"
    | "featured"
    | "type"
    | "handleStock"
    | "currentStock"
    | "position"
    | "images"
  >
> & {
  options?: ProductOptionGroup[];
};

export async function updateProduct(
  id: string,
  patch: ProductPatch,
): Promise<CatalogProduct | null> {
  if (!isSupabaseConfigured()) {
    const products = await readProductsLocal();
    const index = products.findIndex((p) => p.id === id);
    if (index < 0) return null;
    const current = products[index];
    const next: CatalogProduct = {
      ...current,
      ...patch,
      options: (patch.options ?? current.options) as CatalogProduct["options"],
      updatedAt: Date.now(),
    };
    products[index] = next;
    await writeJsonKey(PRODUCTS_KEY, products);
    return next;
  }

  const current = await getProductById(id);
  if (!current) return null;
  const next: CatalogProduct = {
    ...current,
    ...patch,
    options: (patch.options ?? current.options) as CatalogProduct["options"],
    updatedAt: Date.now(),
  };
  const row = productToRow(next);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .update(row)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Supabase update product: ${error.message}`);
  return data ? rowToProduct(data as Record<string, unknown>) : next;
}

export async function createProduct(
  input: Omit<CatalogProduct, "createdAt" | "updatedAt"> & {
    createdAt?: number | null;
    updatedAt?: number | null;
  },
): Promise<CatalogProduct> {
  const now = Date.now();
  const product: CatalogProduct = {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  if (!isSupabaseConfigured()) {
    const products = await readProductsLocal();
    products.unshift(product);
    await writeJsonKey(PRODUCTS_KEY, products);
    return product;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .insert(productToRow(product))
    .select("*")
    .single();
  if (error) throw new Error(`Supabase create product: ${error.message}`);
  return rowToProduct(data as Record<string, unknown>);
}

export function slugifyTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
