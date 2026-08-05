import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { CatalogProduct } from "@/lib/catalog";

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

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");

export async function readProducts(): Promise<CatalogProduct[]> {
  const raw = await readFile(PRODUCTS_PATH, "utf8");
  const parsed = JSON.parse(raw) as CatalogProduct[];
  return Array.isArray(parsed) ? parsed : [];
}

async function writeProducts(products: CatalogProduct[]) {
  await writeFile(
    PRODUCTS_PATH,
    `${JSON.stringify(products, null, 2)}\n`,
    "utf8",
  );
}

export async function getProductById(
  id: string,
): Promise<CatalogProduct | null> {
  const products = await readProducts();
  return products.find((p) => p.id === id) ?? null;
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
  const products = await readProducts();
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
  await writeProducts(products);
  return next;
}

export async function createProduct(
  input: Omit<CatalogProduct, "createdAt" | "updatedAt"> & {
    createdAt?: number | null;
    updatedAt?: number | null;
  },
): Promise<CatalogProduct> {
  const products = await readProducts();
  const now = Date.now();
  const product: CatalogProduct = {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  products.unshift(product);
  await writeProducts(products);
  return product;
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
