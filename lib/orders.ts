import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { makeAccessToken } from "@/lib/order-access";
import {
  releaseStock,
  reserveStock,
  resolveCartLines,
  type CartLineInput,
} from "@/lib/inventory";
import { withStoreLock } from "@/lib/store-lock";

export type OrderItem = {
  key: string;
  productId: string;
  slug: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  optionLabel?: string;
  optionId?: string;
};

export type OrderStatus =
  | "pending_payment"
  | "pending_review"
  | "paid"
  | "cancelled";

/** Logística / envío (independiente del pago). */
export type FulfillmentStatus =
  | "unfulfilled"
  | "preparing"
  | "ready_pickup"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderCustomer = {
  name: string;
  phone: string;
  city: string;
  fulfillment: "pickup" | "delivery";
  address?: string;
  note?: string;
  location?: {
    lat: number;
    lng: number;
    mapsUrl: string;
  };
};

export type Order = {
  id: string;
  /** Token secreto para ver/pagar el pedido sin ser admin. */
  accessToken: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  currency: "BOB";
  /** Nombre de archivo en data/receipts (no URL pública). */
  receiptFile?: string;
  /** @deprecated Rutas públicas antiguas; preferir receiptFile. */
  receiptPath?: string;
  receiptUploadedAt?: string;
  adminNote?: string;
  /** Stock ya descontado al crear el pedido. */
  stockReserved?: boolean;
};

const ORDERS_PATH = path.join(process.cwd(), "data", "orders.json");
const RECEIPTS_DIR = path.join(process.cwd(), "data", "receipts");

async function ensureOrdersFile() {
  try {
    await readFile(ORDERS_PATH, "utf8");
  } catch {
    await mkdir(path.dirname(ORDERS_PATH), { recursive: true });
    await writeFile(ORDERS_PATH, "[]\n", "utf8");
  }
}

function normalizeOrder(order: Order): Order {
  return {
    ...order,
    accessToken: order.accessToken || "",
    fulfillmentStatus: order.fulfillmentStatus ?? "unfulfilled",
    stockReserved: order.stockReserved ?? false,
  };
}

export async function readOrders(): Promise<Order[]> {
  await ensureOrdersFile();
  const raw = await readFile(ORDERS_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Order[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeOrder);
  } catch {
    return [];
  }
}

async function ensureAllAccessTokens() {
  await withStoreLock(async () => {
    const orders = await readOrders();
    let dirty = false;
    const next = orders.map((order) => {
      if (order.accessToken) return order;
      dirty = true;
      return { ...order, accessToken: makeAccessToken() };
    });
    if (dirty) await writeOrders(next);
  });
}

export type OrderListStatusFilter =
  | "all"
  | "pending"
  | "paid"
  | "cancelled"
  | "pending_payment"
  | "pending_review";

export type OrderListQuery = {
  page?: number;
  pageSize?: number;
  status?: OrderListStatusFilter;
  /** YYYY-MM-DD inclusive */
  from?: string;
  /** YYYY-MM-DD inclusive */
  to?: string;
};

export type OrderListResult = {
  orders: Order[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function matchesStatus(order: Order, status: OrderListStatusFilter) {
  if (status === "all") return true;
  if (status === "pending") {
    return (
      order.status === "pending_payment" || order.status === "pending_review"
    );
  }
  return order.status === status;
}

/** Lista filtrada + paginada (más nuevo primero). */
export async function listOrders(
  query: OrderListQuery = {},
): Promise<OrderListResult> {
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const page = Math.max(1, Number(query.page) || 1);
  const status = query.status ?? "all";

  const fromTime = query.from ? Date.parse(`${query.from}T00:00:00`) : NaN;
  const toTime = query.to ? Date.parse(`${query.to}T23:59:59.999`) : NaN;

  await ensureAllAccessTokens();
  let orders = await readOrders();

  orders = orders.filter((order) => {
    if (!matchesStatus(order, status)) return false;
    const created = Date.parse(order.createdAt);
    if (!Number.isFinite(created)) return false;
    if (Number.isFinite(fromTime) && created < fromTime) return false;
    if (Number.isFinite(toTime) && created > toTime) return false;
    return true;
  });

  orders.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const total = orders.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    orders: orders.slice(start, start + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
  };
}

async function writeOrders(orders: Order[]) {
  await ensureOrdersFile();
  await writeFile(ORDERS_PATH, `${JSON.stringify(orders, null, 2)}\n`, "utf8");
}

function makeOrderId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SMP-${stamp}-${rand}`;
}

/** Asegura token en pedidos viejos y persiste si faltaba. */
export async function ensureOrderAccessToken(id: string): Promise<Order | null> {
  return withStoreLock(async () => {
    const orders = await readOrders();
    const index = orders.findIndex((o) => o.id === id);
    if (index < 0) return null;
    if (orders[index].accessToken) return orders[index];
    orders[index] = {
      ...orders[index],
      accessToken: makeAccessToken(),
      updatedAt: new Date().toISOString(),
    };
    await writeOrders(orders);
    return orders[index];
  });
}

export async function createOrder(input: {
  customer: OrderCustomer;
  lines: CartLineInput[];
}): Promise<Order> {
  return withStoreLock(async () => {
    const items = await resolveCartLines(input.lines);
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    await reserveStock(items);

    const now = new Date().toISOString();
    const order: Order = {
      id: makeOrderId(),
      accessToken: makeAccessToken(),
      createdAt: now,
      updatedAt: now,
      status: "pending_payment",
      fulfillmentStatus: "unfulfilled",
      customer: input.customer,
      items,
      subtotal,
      currency: "BOB",
      stockReserved: true,
    };

    const orders = await readOrders();
    orders.unshift(order);
    await writeOrders(orders);
    return order;
  });
}

export async function getOrderById(id: string): Promise<Order | null> {
  const orders = await readOrders();
  const found = orders.find((o) => o.id === id) ?? null;
  if (!found) return null;
  if (!found.accessToken) {
    return ensureOrderAccessToken(id);
  }
  return found;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order | null> {
  return updateOrder(id, { status });
}

export type OrderPatch = {
  status?: OrderStatus;
  fulfillmentStatus?: FulfillmentStatus;
  adminNote?: string;
};

export async function updateOrder(
  id: string,
  patch: OrderPatch,
): Promise<Order | null> {
  return withStoreLock(async () => {
    const orders = await readOrders();
    const index = orders.findIndex((o) => o.id === id);
    if (index < 0) return null;

    const current = normalizeOrder(orders[index]);
    const next: Order = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    const cancelling =
      patch.status === "cancelled" && current.status !== "cancelled";
    if (cancelling && current.stockReserved) {
      await releaseStock(current.items);
      next.stockReserved = false;
    }

    orders[index] = next;
    await writeOrders(orders);
    return orders[index];
  });
}

export function receiptDiskPath(filename: string) {
  return path.join(RECEIPTS_DIR, filename);
}

export async function saveOrderReceipt(
  id: string,
  file: {
    bytes: Buffer;
    filename: string;
    mimeType: string;
  },
): Promise<Order | null> {
  return withStoreLock(async () => {
    const orders = await readOrders();
    const index = orders.findIndex((o) => o.id === id);
    if (index < 0) return null;

    if (orders[index].status === "cancelled") {
      throw new Error("Este pedido está cancelado");
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/pdf",
    ];
    if (!allowed.includes(file.mimeType)) {
      throw new Error("Formato no permitido. Usa foto (JPG/PNG/WEBP) o PDF.");
    }

    if (file.bytes.length > 8 * 1024 * 1024) {
      throw new Error("El archivo supera 8 MB.");
    }

    await mkdir(RECEIPTS_DIR, { recursive: true });

    const ext =
      file.mimeType === "application/pdf"
        ? "pdf"
        : file.mimeType === "image/png"
          ? "png"
          : file.mimeType === "image/webp"
            ? "webp"
            : file.mimeType === "image/heic" || file.mimeType === "image/heif"
              ? "heic"
              : "jpg";

    const safeName = `${id.replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}.${ext}`;
    await writeFile(path.join(RECEIPTS_DIR, safeName), file.bytes);

    const now = new Date().toISOString();

    orders[index] = {
      ...orders[index],
      receiptFile: safeName,
      receiptPath: undefined,
      receiptUploadedAt: now,
      status: orders[index].status === "paid" ? "paid" : "pending_review",
      updatedAt: now,
    };

    await writeOrders(orders);
    return orders[index];
  });
}
