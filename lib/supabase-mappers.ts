import type { CatalogProduct } from "@/lib/catalog";
import type { Order, OrderCustomer, OrderItem } from "@/lib/orders";

/** Fila DB → CatalogProduct */
export function rowToProduct(row: Record<string, unknown>): CatalogProduct {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description ?? ""),
    category: String(row.category ?? ""),
    price: Number(row.price ?? 0),
    originalPrice: Number(row.original_price ?? row.price ?? 0),
    currency: String(row.currency ?? "BOB"),
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    featured: Boolean(row.featured),
    type: String(row.type ?? "available"),
    handleStock: Boolean(row.handle_stock),
    currentStock: Number(row.current_stock ?? 0),
    position: Number(row.position ?? 0),
    options: Array.isArray(row.options) ? row.options : [],
    createdAt: row.created_at
      ? new Date(String(row.created_at)).getTime()
      : null,
    updatedAt: row.updated_at
      ? new Date(String(row.updated_at)).getTime()
      : null,
  };
}

export function productToRow(product: CatalogProduct) {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description ?? "",
    category: product.category ?? "",
    price: product.price,
    original_price: product.originalPrice,
    currency: product.currency || "BOB",
    images: product.images ?? [],
    featured: Boolean(product.featured),
    type: product.type || "available",
    handle_stock: Boolean(product.handleStock),
    current_stock: product.currentStock ?? 0,
    position: product.position ?? 0,
    options: product.options ?? [],
    created_at: product.createdAt
      ? new Date(product.createdAt).toISOString()
      : null,
    updated_at: product.updatedAt
      ? new Date(product.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

export function rowToOrder(row: Record<string, unknown>): Order {
  const customer: OrderCustomer = {
    name: String(row.customer_name ?? ""),
    phone: String(row.customer_phone ?? ""),
    city: String(row.customer_city ?? ""),
    fulfillment:
      row.fulfillment === "delivery" ? "delivery" : "pickup",
    address: row.customer_address
      ? String(row.customer_address)
      : undefined,
    note: row.customer_note ? String(row.customer_note) : undefined,
    location:
      row.customer_location && typeof row.customer_location === "object"
        ? (row.customer_location as OrderCustomer["location"])
        : undefined,
  };

  return {
    id: String(row.id),
    accessToken: String(row.access_token ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    status: row.status as Order["status"],
    fulfillmentStatus:
      (row.fulfillment_status as Order["fulfillmentStatus"]) ?? "unfulfilled",
    customer,
    items: (Array.isArray(row.items) ? row.items : []) as OrderItem[],
    subtotal: Number(row.subtotal ?? 0),
    currency: "BOB",
    receiptFile: row.receipt_path ? String(row.receipt_path) : undefined,
    receiptUploadedAt: row.receipt_uploaded_at
      ? String(row.receipt_uploaded_at)
      : undefined,
    adminNote: row.admin_note ? String(row.admin_note) : undefined,
    stockReserved: Boolean(row.stock_reserved),
  };
}

export function orderToRow(order: Order) {
  return {
    id: order.id,
    access_token: order.accessToken,
    status: order.status,
    fulfillment_status: order.fulfillmentStatus,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    customer_city: order.customer.city,
    fulfillment: order.customer.fulfillment,
    customer_address: order.customer.address ?? null,
    customer_note: order.customer.note ?? null,
    customer_location: order.customer.location ?? null,
    items: order.items,
    subtotal: order.subtotal,
    currency: order.currency,
    receipt_path: order.receiptFile ?? null,
    receipt_uploaded_at: order.receiptUploadedAt ?? null,
    admin_note: order.adminNote ?? null,
    stock_reserved: Boolean(order.stockReserved),
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}
