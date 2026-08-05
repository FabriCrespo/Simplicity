import type { CatalogProduct } from "@/lib/catalog";
import type { OrderItem } from "@/lib/orders";
import {
  readProducts,
  type ProductOptionChoice,
  type ProductOptionGroup,
} from "@/lib/products-store";
import { writeFile } from "fs/promises";
import path from "path";

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");

export type CartLineInput = {
  productId: string;
  quantity: number;
  optionId?: string;
  /** Solo fallback para carritos viejos sin optionId. */
  optionLabel?: string;
};

type ResolvedOption = {
  group: ProductOptionGroup;
  choice: ProductOptionChoice;
};

function asGroups(product: CatalogProduct): ProductOptionGroup[] {
  const raw = product.options;
  if (!Array.isArray(raw)) return [];
  return raw as ProductOptionGroup[];
}

function findOptionById(
  product: CatalogProduct,
  optionId: string,
): ResolvedOption | null {
  for (const group of asGroups(product)) {
    const choice = (group.options ?? []).find((o) => o.id === optionId);
    if (choice) return { group, choice };
  }
  return null;
}

function findOptionByLabel(
  product: CatalogProduct,
  optionLabel: string,
): ResolvedOption | null {
  const needle = optionLabel.trim().toLowerCase();
  if (!needle) return null;

  const matches: ResolvedOption[] = [];
  for (const group of asGroups(product)) {
    for (const choice of group.options ?? []) {
      const title = choice.title.trim().toLowerCase();
      const combined = `${group.title.trim()} · ${choice.title.trim()}`.toLowerCase();
      if (title === needle || combined === needle) {
        matches.push({ group, choice });
      }
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

function optionLabelFor(resolved: ResolvedOption | null, multiGroup: boolean) {
  if (!resolved) return undefined;
  if (multiGroup && resolved.group.title) {
    return `${resolved.group.title.trim()} · ${resolved.choice.title.trim()}`;
  }
  return resolved.choice.title.trim();
}

function assertPurchasable(product: CatalogProduct) {
  if (product.type === "hidden") {
    throw new Error(`El producto ${product.title} no está disponible`);
  }
  if (product.type === "unavailable") {
    throw new Error(`${product.title} está sin stock`);
  }
}

type StockTarget =
  | { kind: "product"; productId: string }
  | { kind: "option"; productId: string; optionId: string };

function stockTarget(
  product: CatalogProduct,
  resolved: ResolvedOption | null,
): StockTarget | null {
  if (resolved?.choice.handleStock) {
    return {
      kind: "option",
      productId: product.id,
      optionId: resolved.choice.id,
    };
  }
  if (product.handleStock) {
    return { kind: "product", productId: product.id };
  }
  return null;
}

function availableStock(
  product: CatalogProduct,
  resolved: ResolvedOption | null,
): number | null {
  const target = stockTarget(product, resolved);
  if (!target) return null;
  if (target.kind === "option" && resolved) {
    return resolved.choice.currentStock;
  }
  return product.currentStock;
}

/** Valida líneas del carrito y arma ítems con precio del catálogo (no del cliente). */
export async function resolveCartLines(
  lines: CartLineInput[],
): Promise<OrderItem[]> {
  if (!lines.length) throw new Error("El carrito está vacío");

  const products = await readProducts();
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: OrderItem[] = [];

  for (const line of lines) {
    const productId = String(line.productId ?? "").trim();
    const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));
    if (!productId || quantity < 1) {
      throw new Error("Hay un ítem inválido en el carrito");
    }
    if (quantity > 50) {
      throw new Error("Cantidad máxima por ítem: 50");
    }

    const product = byId.get(productId);
    if (!product) {
      throw new Error("Un producto del carrito ya no existe");
    }
    assertPurchasable(product);

    const groups = asGroups(product);
    const multiGroup = groups.length > 1;
    let resolved: ResolvedOption | null = null;

    if (line.optionId) {
      resolved = findOptionById(product, line.optionId);
      if (!resolved) {
        throw new Error(`Opción no válida en ${product.title}`);
      }
    } else if (line.optionLabel) {
      resolved = findOptionByLabel(product, line.optionLabel);
    }

    if (resolved && resolved.choice.enabled === false) {
      throw new Error(
        `La opción elegida de ${product.title} no está disponible`,
      );
    }

    const stock = availableStock(product, resolved);
    if (stock !== null && stock < quantity) {
      throw new Error(
        `Stock insuficiente: ${product.title}${
          resolved ? ` (${resolved.choice.title})` : ""
        }`,
      );
    }

    const unitPrice = product.price + (resolved?.choice.price ?? 0);
    const optionId = resolved?.choice.id;
    const label = optionLabelFor(resolved, multiGroup);
    const key = `${product.id}::${optionId ?? label ?? "default"}`;

    items.push({
      key,
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: unitPrice,
      image: product.images[0] ?? "",
      quantity,
      optionLabel: label,
      optionId,
    });
  }

  // Agregar cantidades del mismo SKU para chequear stock total
  const demand = new Map<string, { product: CatalogProduct; resolved: ResolvedOption | null; qty: number }>();
  for (const item of items) {
    const product = byId.get(item.productId)!;
    const resolved = item.optionId
      ? findOptionById(product, item.optionId)
      : null;
    const mapKey = `${item.productId}::${item.optionId ?? "base"}`;
    const prev = demand.get(mapKey);
    if (prev) prev.qty += item.quantity;
    else demand.set(mapKey, { product, resolved, qty: item.quantity });
  }

  for (const { product, resolved, qty } of demand.values()) {
    const stock = availableStock(product, resolved);
    if (stock !== null && stock < qty) {
      throw new Error(
        `Stock insuficiente: ${product.title}${
          resolved ? ` (${resolved.choice.title})` : ""
        }`,
      );
    }
  }

  return items;
}

async function writeProducts(products: CatalogProduct[]) {
  await writeFile(
    PRODUCTS_PATH,
    `${JSON.stringify(products, null, 2)}\n`,
    "utf8",
  );
}

function applyStockDelta(
  products: CatalogProduct[],
  items: OrderItem[],
  direction: 1 | -1,
) {
  const byId = new Map(products.map((p, i) => [p.id, i]));

  for (const item of items) {
    const index = byId.get(item.productId);
    if (index === undefined) continue;
    const product = products[index];
    const resolved = item.optionId
      ? findOptionById(product, item.optionId)
      : null;
    const target = stockTarget(product, resolved);
    if (!target) continue;

    const delta = direction * item.quantity;

    if (target.kind === "option" && item.optionId) {
      const groups = asGroups(product);
      const nextGroups = groups.map((group) => ({
        ...group,
        options: (group.options ?? []).map((opt) => {
          if (opt.id !== item.optionId || !opt.handleStock) return opt;
          const next = opt.currentStock + delta;
          if (direction < 0 && next < 0) {
            throw new Error(
              `Stock insuficiente: ${product.title} (${opt.title})`,
            );
          }
          return { ...opt, currentStock: next };
        }),
      }));
      products[index] = {
        ...product,
        options: nextGroups as CatalogProduct["options"],
        updatedAt: Date.now(),
      };
    } else if (target.kind === "product" && product.handleStock) {
      const next = product.currentStock + delta;
      if (direction < 0 && next < 0) {
        throw new Error(`Stock insuficiente: ${product.title}`);
      }
      products[index] = {
        ...product,
        currentStock: next,
        updatedAt: Date.now(),
      };
    }
  }
}

/** Reserva (resta) stock al crear el pedido. */
export async function reserveStock(items: OrderItem[]) {
  const products = await readProducts();
  applyStockDelta(products, items, -1);
  await writeProducts(products);
}

/** Devuelve stock al cancelar. */
export async function releaseStock(items: OrderItem[]) {
  const products = await readProducts();
  applyStockDelta(products, items, 1);
  await writeProducts(products);
}
