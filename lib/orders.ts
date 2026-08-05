import { makeAccessToken } from "@/lib/order-access";
import {
  releaseStock,
  reserveStock,
  resolveCartLines,
  type CartLineInput,
} from "@/lib/inventory";
import {
  readBinaryKey,
  readJsonKey,
  readLegacyPublicReceipt,
  writeBinaryKey,
  writeJsonKey,
} from "@/lib/kv-store";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  RECEIPTS_BUCKET,
} from "@/lib/supabase";
import { orderToRow, rowToOrder } from "@/lib/supabase-mappers";
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
  accessToken: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  currency: "BOB";
  receiptFile?: string;
  receiptPath?: string;
  receiptUploadedAt?: string;
  adminNote?: string;
  stockReserved?: boolean;
};

const ORDERS_KEY = "orders";

function normalizeOrder(order: Order): Order {
  return {
    ...order,
    accessToken: order.accessToken || "",
    fulfillmentStatus: order.fulfillmentStatus ?? "unfulfilled",
    stockReserved: order.stockReserved ?? false,
  };
}

async function readOrdersLocal(): Promise<Order[]> {
  const parsed = await readJsonKey<Order[]>(ORDERS_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeOrder);
}

export async function readOrders(): Promise<Order[]> {
  if (!isSupabaseConfigured()) {
    return readOrdersLocal();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase orders: ${error.message}`);
  return (data ?? []).map((row) =>
    normalizeOrder(rowToOrder(row as Record<string, unknown>)),
  );
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
  from?: string;
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

async function persistOrder(order: Order) {
  if (!isSupabaseConfigured()) {
    const orders = await readOrdersLocal();
    const index = orders.findIndex((o) => o.id === order.id);
    if (index >= 0) orders[index] = order;
    else orders.unshift(order);
    await writeJsonKey(ORDERS_KEY, orders);
    return order;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .upsert(orderToRow(order))
    .select("*")
    .single();
  if (error) throw new Error(`Supabase save order: ${error.message}`);
  return normalizeOrder(rowToOrder(data as Record<string, unknown>));
}

async function ensureAllAccessTokens() {
  await withStoreLock(async () => {
    const orders = await readOrders();
    const missing = orders.filter((o) => !o.accessToken);
    if (!missing.length) return;

    for (const order of missing) {
      await persistOrder({
        ...order,
        accessToken: makeAccessToken(),
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

function makeOrderId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SMP-${stamp}-${rand}`;
}

async function fetchOrderById(id: string): Promise<Order | null> {
  if (!isSupabaseConfigured()) {
    return (await readOrdersLocal()).find((o) => o.id === id) ?? null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Supabase get order: ${error.message}`);
  if (!data) return null;
  return normalizeOrder(rowToOrder(data as Record<string, unknown>));
}

export async function ensureOrderAccessToken(id: string): Promise<Order | null> {
  return withStoreLock(async () => {
    const order = await fetchOrderById(id);
    if (!order) return null;
    if (order.accessToken) return order;
    return persistOrder({
      ...order,
      accessToken: makeAccessToken(),
      updatedAt: new Date().toISOString(),
    });
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

    return persistOrder(order);
  });
}

export async function getOrderById(id: string): Promise<Order | null> {
  const found = await fetchOrderById(id);
  if (!found) return null;
  if (!found.accessToken) return ensureOrderAccessToken(id);
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
    const current = await fetchOrderById(id);
    if (!current) return null;

    const next: Order = {
      ...normalizeOrder(current),
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    const cancelling =
      patch.status === "cancelled" && current.status !== "cancelled";
    if (cancelling && current.stockReserved) {
      await releaseStock(current.items);
      next.stockReserved = false;
    }

    return persistOrder(next);
  });
}

export async function readOrderReceiptBytes(
  order: Order,
): Promise<{ bytes: Buffer; filename: string } | null> {
  const key = order.receiptFile;
  if (key) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .download(key);
      if (!error && data) {
        const ab = await data.arrayBuffer();
        return { bytes: Buffer.from(ab), filename: key.split("/").pop() || key };
      }
    }

    const local = await readBinaryKey(key);
    if (local) return { bytes: local, filename: key };
  }

  if (order.receiptPath?.startsWith("/uploads/receipts/")) {
    const filename = order.receiptPath.split("/").pop() || "receipt";
    const bytes = await readLegacyPublicReceipt(order.receiptPath);
    if (bytes) return { bytes, filename };
  }

  return null;
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
    const current = await fetchOrderById(id);
    if (!current) return null;

    if (current.status === "cancelled") {
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

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const ab = file.bytes.buffer.slice(
        file.bytes.byteOffset,
        file.bytes.byteOffset + file.bytes.byteLength,
      ) as ArrayBuffer;
      const { error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(safeName, ab, {
          contentType: file.mimeType,
          upsert: false,
        });
      if (error) throw new Error(`Storage receipt: ${error.message}`);
    } else {
      await writeBinaryKey(safeName, file.bytes, file.mimeType);
    }

    const now = new Date().toISOString();
    return persistOrder({
      ...current,
      receiptFile: safeName,
      receiptPath: undefined,
      receiptUploadedAt: now,
      status: current.status === "paid" ? "paid" : "pending_review",
      updatedAt: now,
    });
  });
}
