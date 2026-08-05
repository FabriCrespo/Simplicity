import { NextResponse } from "next/server";
import { requireAdminPin } from "@/lib/admin-auth";
import {
  createProduct,
  readProducts,
  slugifyTitle,
} from "@/lib/products-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const type = searchParams.get("type") ?? "all";
  const stock = searchParams.get("stock") ?? "all";

  let products = await readProducts();

  if (type !== "all") {
    products = products.filter((p) => p.type === type);
  }

  if (stock === "tracked") {
    products = products.filter((p) => p.handleStock);
  } else if (stock === "low") {
    products = products.filter(
      (p) => p.handleStock && p.currentStock > 0 && p.currentStock <= 3,
    );
  } else if (stock === "out") {
    products = products.filter(
      (p) => p.handleStock && p.currentStock <= 0,
    );
  }

  if (q) {
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }

  products = [...products].sort(
    (a, b) =>
      a.position - b.position || a.title.localeCompare(b.title, "es"),
  );

  return NextResponse.json({ products, total: products.length });
}

export async function POST(request: Request) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      category?: string;
      price?: number;
      originalPrice?: number;
      type?: string;
      featured?: boolean;
      handleStock?: boolean;
      currentStock?: number;
      images?: string[];
      options?: unknown;
    };

    const title = String(body.title ?? "").trim();
    if (title.length < 2) {
      return NextResponse.json({ error: "Título requerido" }, { status: 400 });
    }

    const slugBase = slugifyTitle(title) || `producto-${Date.now()}`;
    const existing = await readProducts();
    let slug = slugBase;
    let i = 2;
    while (existing.some((p) => p.slug === slug)) {
      slug = `${slugBase}-${i}`;
      i += 1;
    }

    const options = Array.isArray(body.options) ? body.options : [];

    const product = await createProduct({
      id: `smp_${Date.now().toString(36)}`,
      slug,
      title,
      description: String(body.description ?? "").trim(),
      category: String(body.category ?? "Sin categoría").trim() || "Sin categoría",
      price: Number(body.price ?? 0),
      originalPrice: Number(body.originalPrice ?? body.price ?? 0),
      currency: "BOB",
      images: Array.isArray(body.images)
        ? body.images.filter((u) => typeof u === "string" && u.trim())
        : [],
      featured: Boolean(body.featured),
      type: body.type ?? "hidden",
      handleStock: Boolean(body.handleStock),
      currentStock: Math.max(0, Number(body.currentStock ?? 0)),
      position: existing.length,
      options,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo crear el producto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
